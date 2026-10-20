<template lang="pug">
  .vn-cmts(v-intersect.once='onIntersect')
    //- LIST
    p.vn-cmts__note(v-if='isLoading && !hasLoadedOnce') {{$t('common:comments.loading')}}
    .vn-cmts__list(v-else-if='comments && comments.length > 0')
      article.vn-cmt(
        v-for='cm of comments'
        :key='`comment-` + cm.id'
        :id='`comment-post-id-` + cm.id'
        )
        span.vn-cmt__av(aria-hidden='true') {{cm.initials}}
        .vn-cmt__who
          b {{cm.authorName}}
          span(:title='cm.createdAt') {{cm.createdAt | moment('from') }}
          span(v-if='cm.createdAt !== cm.updatedAt', :title='cm.updatedAt') · {{$t('common:comments.modified', { reldate: $options.filters.moment(cm.updatedAt, 'from') })}}
          span.vn-cmt__acts(v-if='permissions.manage && !isBusy && commentEditId === 0')
            button(type='button', @click='editComment(cm)') {{$t('common:actions.edit')}}
            button(type='button', @click='deleteCommentConfirm(cm)') {{$t('common:actions.delete')}}
        .vn-cmt__body(v-if='commentEditId !== cm.id', v-html='cm.render')
        .vn-cform.is-edit(v-else)
          textarea(
            v-model='commentEditContent'
            rows='3'
            :aria-label='$t(`common:comments.fieldContent`)'
            )
          .vn-cform__foot
            span.vn-cform__btns
              button.vn-btn.is-ghost(type='button', @click='editCommentCancel') {{$t('common:actions.cancel')}}
              button.vn-btn(type='button', @click='updateComment') {{$t('common:comments.updateComment')}}
    p.vn-cmts__note(v-else-if='permissions.write') {{$t('common:comments.beFirst')}}
    p.vn-cmts__note(v-else) {{$t('common:comments.none')}}

    //- NEW COMMENT
    form.vn-cform(v-if='permissions.write', @submit.prevent='postComment')
      span.vn-cmt__av(aria-hidden='true') {{myInitials}}
      textarea#discussion-new(
        v-model='newcomment'
        rows='3'
        maxlength='4000'
        :placeholder='$t(`common:comments.newPlaceholder`)'
        :aria-label='$t(`common:comments.fieldContent`)'
        )
      .vn-cform__guest(v-if='!isAuthenticated')
        input(
          v-model='guestName'
          autocomplete='name'
          :placeholder='$t(`common:comments.fieldName`)'
          :aria-label='$t(`common:comments.fieldName`)'
          )
        input(
          v-model='guestEmail'
          type='email'
          autocomplete='email'
          :placeholder='$t(`common:comments.fieldEmail`)'
          :aria-label='$t(`common:comments.fieldEmail`)'
          )
      .vn-cform__foot
        span {{$t('common:comments.markdownFormat')}}
        button.vn-btn(type='submit') {{$t('common:comments.postComment')}}
    a.vn-btn.is-ghost.vn-cmts__login(v-else-if='!isAuthenticated', href='/login') {{$t('common:comments.loginToComment', 'Đăng nhập để bình luận')}}

    v-dialog(v-model='deleteCommentDialogShown', max-width='500')
      v-card
        .dialog-header.is-red {{$t('common:comments.deleteConfirmTitle')}}
        v-card-text.pt-5
          span {{$t('common:comments.deleteWarn')}}
          .caption: strong {{$t('common:comments.deletePermanentWarn')}}
        v-card-chin
          v-spacer
          v-btn(text, @click='deleteCommentDialogShown = false') {{$t('common:actions.cancel')}}
          v-btn(color='red', dark, @click='deleteComment') {{$t('common:actions.delete')}}
</template>

<script>
import gql from 'graphql-tag'
import { get } from 'vuex-pathify'
import validate from 'validate.js'
import _ from 'lodash'

// -> "Nguyễn Văn An" -> "NA"
function initialsOf (name) {
  const parts = _.compact(String(name || '').toUpperCase().split(' '))
  if (parts.length < 1) { return '?' }
  return parts.length > 1 ? parts[0].charAt(0) + _.last(parts).charAt(0) : parts[0].charAt(0)
}

export default {
  data () {
    return {
      newcomment: '',
      isLoading: true,
      hasLoadedOnce: false,
      comments: [],
      guestName: '',
      guestEmail: '',
      commentToDelete: {},
      commentEditId: 0,
      commentEditContent: null,
      deleteCommentDialogShown: false,
      isBusy: false,
      scrollOpts: {
        duration: 1500,
        offset: 0,
        easing: 'easeInOutCubic'
      }
    }
  },
  computed: {
    pageId: get('page/id'),
    permissions: get('page/effectivePermissions@comments'),
    isAuthenticated: get('user/authenticated'),
    userDisplayName: get('user/name'),
    myInitials () {
      return initialsOf(this.isAuthenticated ? this.userDisplayName : this.guestName)
    }
  },
  methods: {
    onIntersect (entries, observer, isIntersecting) {
      if (isIntersecting) {
        this.fetch(true)
      }
    },
    async fetch (silent = false) {
      this.isLoading = true
      try {
        const results = await this.$apollo.query({
          query: gql`
            query ($locale: String!, $path: String!) {
              comments {
                list(locale: $locale, path: $path) {
                  id
                  render
                  authorName
                  createdAt
                  updatedAt
                }
              }
            }
          `,
          variables: {
            locale: this.$store.get('page/locale'),
            path: this.$store.get('page/path')
          },
          fetchPolicy: 'network-only'
        })
        this.comments = _.get(results, 'data.comments.list', []).map(c => {
          c.initials = initialsOf(c.authorName)
          return c
        })
      } catch (err) {
        console.warn(err)
        if (!silent) {
          this.$store.commit('showNotification', {
            style: 'red',
            message: err.message,
            icon: 'alert'
          })
        }
      }
      this.isLoading = false
      this.hasLoadedOnce = true
    },
    /**
     * Post New Comment
     */
    async postComment () {
      let rules = {
        comment: {
          presence: {
            allowEmpty: false
          },
          length: {
            minimum: 2
          }
        }
      }
      if (!this.isAuthenticated && this.permissions.write) {
        rules.name = {
          presence: {
            allowEmpty: false
          },
          length: {
            minimum: 2,
            maximum: 255
          }
        }
        rules.email = {
          presence: {
            allowEmpty: false
          },
          email: true
        }
      }
      const validationResults = validate({
        comment: this.newcomment,
        name: this.guestName,
        email: this.guestEmail
      }, rules, { format: 'flat' })

      if (validationResults) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: validationResults[0],
          icon: 'alert'
        })
        return
      }

      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $pageId: Int!
              $replyTo: Int
              $content: String!
              $guestName: String
              $guestEmail: String
            ) {
              comments {
                create (
                  pageId: $pageId
                  replyTo: $replyTo
                  content: $content
                  guestName: $guestName
                  guestEmail: $guestEmail
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                  id
                }
              }
            }
          `,
          variables: {
            pageId: this.pageId,
            replyTo: 0,
            content: this.newcomment,
            guestName: this.guestName,
            guestEmail: this.guestEmail
          }
        })

        if (_.get(resp, 'data.comments.create.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('common:comments.postSuccess'),
            icon: 'check'
          })

          this.newcomment = ''
          await this.fetch()
          this.$nextTick(() => {
            this.$vuetify.goTo(`#comment-post-id-${_.get(resp, 'data.comments.create.id', 0)}`, this.scrollOpts)
          })
        } else {
          throw new Error(_.get(resp, 'data.comments.create.responseResult.message', 'An unexpected error occurred.'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
    },
    /**
     * Show Comment Editing Form
     */
    async editComment (cm) {
      this.$store.commit(`loadingStart`, 'comments-edit')
      this.isBusy = true
      try {
        const results = await this.$apollo.query({
          query: gql`
            query ($id: Int!) {
              comments {
                single(id: $id) {
                  content
                }
              }
            }
          `,
          variables: {
            id: cm.id
          },
          fetchPolicy: 'network-only'
        })
        this.commentEditContent = _.get(results, 'data.comments.single.content', null)
        if (this.commentEditContent === null) {
          throw new Error('Failed to load comment content.')
        }
      } catch (err) {
        console.warn(err)
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.commentEditId = cm.id
      this.isBusy = false
      this.$store.commit(`loadingStop`, 'comments-edit')
    },
    /**
     * Cancel Comment Edit
     */
    editCommentCancel () {
      this.commentEditId = 0
      this.commentEditContent = null
    },
    /**
     * Update Comment with new content
     */
    async updateComment () {
      this.$store.commit(`loadingStart`, 'comments-edit')
      this.isBusy = true
      try {
        if (this.commentEditContent.length < 2) {
          throw new Error(this.$t('common:comments.contentMissingError'))
        }
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $id: Int!
              $content: String!
            ) {
              comments {
                update (
                  id: $id,
                  content: $content
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                  render
                }
              }
            }
          `,
          variables: {
            id: this.commentEditId,
            content: this.commentEditContent
          }
        })

        if (_.get(resp, 'data.comments.update.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('common:comments.updateSuccess'),
            icon: 'check'
          })

          const cm = _.find(this.comments, ['id', this.commentEditId])
          cm.render = _.get(resp, 'data.comments.update.render', '-- Failed to load updated comment --')
          cm.updatedAt = (new Date()).toISOString()

          this.editCommentCancel()
        } else {
          throw new Error(_.get(resp, 'data.comments.delete.responseResult.message', 'An unexpected error occurred.'))
        }
      } catch (err) {
        console.warn(err)
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isBusy = false
      this.$store.commit(`loadingStop`, 'comments-edit')
    },
    /**
     * Show Delete Comment Confirmation Dialog
     */
    deleteCommentConfirm (cm) {
      this.commentToDelete = cm
      this.deleteCommentDialogShown = true
    },
    /**
     * Delete Comment
     */
    async deleteComment () {
      this.$store.commit(`loadingStart`, 'comments-delete')
      this.isBusy = true
      this.deleteCommentDialogShown = false

      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $id: Int!
            ) {
              comments {
                delete (
                  id: $id
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                }
              }
            }
          `,
          variables: {
            id: this.commentToDelete.id
          }
        })

        if (_.get(resp, 'data.comments.delete.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('common:comments.deleteSuccess'),
            icon: 'check'
          })

          this.comments = _.reject(this.comments, ['id', this.commentToDelete.id])
        } else {
          throw new Error(_.get(resp, 'data.comments.delete.responseResult.message', 'An unexpected error occurred.'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isBusy = false
      this.$store.commit(`loadingStop`, 'comments-delete')
    }
  }
}
</script>

<style lang="scss">
.vn-cmts {
  display: grid;
  gap: 16px;
}

.vn-cmts__list {
  display: grid;
  gap: 18px;
}

.vn-cmts__note {
  margin: 0 !important;
  font-size: 0.9375rem;
  color: var(--muted);
}

.vn-cmts__login {
  justify-self: start;
}

.vn-cmt {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 4px 12px;
  scroll-margin-top: calc(var(--topbar-h) + 24px);
}

.vn-cmt__av {
  grid-row: span 2;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.8125rem;
  font-weight: 600;
}

.vn-cmt__who {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  font-size: 0.875rem;

  b {
    font-weight: 600;
    color: var(--ink);
  }

  > span {
    color: var(--muted);
  }
}

.vn-cmt__acts {
  margin-left: auto;
  display: flex;
  gap: 12px;

  button {
    font-size: 0.8125rem;
    color: var(--muted);

    &:hover {
      color: var(--accent);
    }
  }
}

.vn-cmt__body {
  display: grid;
  gap: 8px;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ink);
  overflow-wrap: anywhere;

  > * {
    margin: 0 !important;
    padding: 0 !important;
  }

  pre {
    padding: 10px 12px !important;
    border-radius: 8px;
    background: var(--code-bg);
    overflow-x: auto;

    > code {
      padding: 0;
      background: none;
      box-shadow: none;
      color: var(--code-ink);
      font: 0.8125rem/1.5 var(--font-mono);
    }
  }

  :not(pre) > code {
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--sunken);
    box-shadow: none;
    color: var(--ink);
    font: 0.875em var(--font-mono);
  }

  img {
    max-width: 100%;
    border-radius: 8px;
  }
}

.vn-cform {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 8px 12px;

  &.is-edit {
    grid-template-columns: minmax(0, 1fr);
  }

  textarea,
  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    color: var(--ink);
    font: 0.9375rem/1.55 var(--font-ui);

    &:focus {
      outline: 2px solid var(--accent);
      outline-offset: -1px;
      border-color: transparent;
    }
  }

  textarea {
    min-height: 5.5rem;
    resize: vertical;
  }
}

.vn-cform__guest,
.vn-cform__foot {
  grid-column: 2;

  .is-edit & {
    grid-column: 1;
  }
}

.vn-cform__guest {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 8px;
}

.vn-cform__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 0.8125rem;
  color: var(--muted);
}

.vn-cform__btns {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.vn-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent);
  color: var(--on-accent) !important;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none !important;

  &:hover {
    filter: brightness(1.08);
  }

  &.is-ghost {
    background: transparent;
    color: var(--accent) !important;
  }
}
</style>
