<template lang="pug">
  v-app
    .vn-login(:style='bgStyle')
      main.vn-login__box
        a.vn-login__logo(href='/', :aria-label='siteTitle')
          img(:src='logoUrl', alt='', width='40', height='44')
        h1 {{ screenTitle }}
        v-alert.vn-login__err(
          v-model='errorShown'
          transition='slide-y-reverse-transition'
          color='red darken-2'
          dense
          text
          icon='mdi-alert'
          ) {{errorMessage}}
        //-------------------------------------------------
        //- PROVIDERS LIST
        //-------------------------------------------------
        .vn-login__list(v-if='screen === `login` && strategies.length > 1')
          button.vn-btn.is-wide(
            v-for='(stg, idx) of filteredStrategies'
            :key='stg.key'
            type='button'
            :class='{ "is-ghost": idx > 0 || stg.strategy.useForm }'
            :aria-pressed='stg.key === selectedStrategyKey ? `true` : `false`'
            @click='selectedStrategyKey = stg.key'
            )
            span.vn-login__icon(v-html='stg.icon || stg.strategy.icon', aria-hidden='true')
            span {{ viaLabel(stg) }}
        //-------------------------------------------------
        //- LOGIN FORM
        //-------------------------------------------------
        form.vn-login__form(v-if='screen === `login` && selectedStrategy.strategy.useForm', @submit.prevent='login')
          v-text-field(
            outlined
            dense
            prepend-inner-icon='mdi-account-outline'
            hide-details
            ref='iptEmail'
            v-model='username'
            :label='isUsernameEmail ? $t(`auth:fields.email`) : $t(`auth:fields.username`)'
            :type='isUsernameEmail ? `email` : `text`'
            :autocomplete='isUsernameEmail ? `email` : `username`'
            )
          v-text-field(
            outlined
            dense
            prepend-inner-icon='mdi-lock-outline'
            hide-details
            ref='iptPassword'
            v-model='password'
            :append-icon='hidePassword ? "mdi-eye-off" : "mdi-eye"'
            @click:append='() => (hidePassword = !hidePassword)'
            :type='hidePassword ? "password" : "text"'
            :label='$t("auth:fields.password")'
            autocomplete='current-password'
          )
          button.vn-btn.is-wide(type='submit', :disabled='isLoading')
            v-progress-circular(v-if='isLoading', indeterminate, size='16', width='2')
            span {{ $t('auth:actions.login') }}
          .vn-login__links
            a(href='#forgot', @click.stop.prevent='forgotPassword') {{ $t('auth:forgotPasswordLink') }}
            a(
              v-if='selectedStrategyKey === `local` && selectedStrategy.selfRegistration'
              href='/register'
              ) {{ $t('auth:switchToRegister.link') }}
        //-------------------------------------------------
        //- FORGOT PASSWORD FORM
        //-------------------------------------------------
        form.vn-login__form(v-if='screen === `forgot`', @submit.prevent='forgotPasswordSubmit')
          p.vn-login__info {{ $t('auth:forgotPasswordSubtitle') }}
          v-text-field(
            outlined
            dense
            prepend-inner-icon='mdi-email-outline'
            hide-details
            ref='iptForgotPwdEmail'
            v-model='username'
            :label='$t(`auth:fields.email`)'
            type='email'
            autocomplete='email'
            )
          button.vn-btn.is-wide(type='submit', :disabled='isLoading')
            v-progress-circular(v-if='isLoading', indeterminate, size='16', width='2')
            span {{ $t('auth:sendResetPassword') }}
          .vn-login__links
            a(href='#login', @click.stop.prevent='screen = `login`') {{ $t('auth:forgotPasswordCancel') }}
        //-------------------------------------------------
        //- CHANGE PASSWORD FORM
        //-------------------------------------------------
        form.vn-login__form(v-if='screen === `changePwd`', @submit.prevent='changePassword')
          v-text-field(
            type='password'
            outlined
            dense
            prepend-inner-icon='mdi-lock-outline'
            hide-details
            ref='iptNewPassword'
            v-model='newPassword'
            :label='$t(`auth:changePwd.newPasswordPlaceholder`)'
            autocomplete='new-password'
            )
            password-strength(slot='progress', v-model='newPassword')
          v-text-field(
            type='password'
            outlined
            dense
            prepend-inner-icon='mdi-lock-outline'
            hide-details
            v-model='newPasswordVerify'
            :label='$t(`auth:changePwd.newPasswordVerifyPlaceholder`)'
            autocomplete='new-password'
          )
          button.vn-btn.is-wide(type='submit', :disabled='isLoading')
            v-progress-circular(v-if='isLoading', indeterminate, size='16', width='2')
            span {{ $t('auth:changePwd.proceed') }}

    //-------------------------------------------------
    //- TFA FORM
    //-------------------------------------------------
    v-dialog(v-model='isTFAShown', max-width='500', persistent)
      v-card
        .login-tfa.text-center.pa-5.grey--text.text--darken-3
          img(src='_assets/svg/icon-pin-pad.svg')
          .subtitle-2 {{$t('auth:tfaFormTitle')}}
          v-text-field.login-tfa-field.mt-2(
            solo
            flat
            background-color='white'
            color='blue darken-2'
            hide-details
            ref='iptTFA'
            v-model='securityCode'
            :placeholder='$t("auth:tfa.placeholder")'
            autocomplete='one-time-code'
            @keyup.enter='verifySecurityCode(false)'
            light
          )
          v-btn.mt-2.text-none(
            width='100%'
            large
            color='blue darken-2'
            dark
            @click='verifySecurityCode(false)'
            :loading='isLoading'
            ) {{ $t('auth:tfa.verifyToken') }}

    //-------------------------------------------------
    //- SETUP TFA FORM
    //-------------------------------------------------
    v-dialog(v-model='isTFASetupShown', max-width='600', persistent)
      v-card
        .login-tfa.text-center.pa-5.grey--text.text--darken-3
          .subtitle-1.primary--text {{$t('auth:tfaSetupTitle')}}
          v-divider.my-5
          .subtitle-2 {{$t('auth:tfaSetupInstrFirst')}}
          .caption (#[a(href='https://authy.com/', target='_blank', noopener) Authy], #[a(href='https://support.google.com/accounts/answer/1066447', target='_blank', noopener) Google Authenticator], #[a(href='https://www.microsoft.com/en-us/account/authenticator', target='_blank', noopener) Microsoft Authenticator], etc.)
          .login-tfa-qr.mt-5(v-if='isTFASetupShown', v-html='tfaQRImage')
          .subtitle-2.mt-5 {{$t('auth:tfaSetupInstrSecond')}}
          v-text-field.login-tfa-field.mt-2(
            solo
            flat
            background-color='white'
            color='blue darken-2'
            hide-details
            ref='iptTFASetup'
            v-model='securityCode'
            :placeholder='$t("auth:tfa.placeholder")'
            autocomplete='one-time-code'
            @keyup.enter='verifySecurityCode(true)'
            light
          )
          v-btn.mt-2.text-none(
            width='100%'
            large
            color='blue darken-2'
            dark
            @click='verifySecurityCode(true)'
            :loading='isLoading'
            ) {{ $t('auth:tfa.verifyToken') }}

    loader(v-model='isLoading', :color='loaderColor', :title='loaderTitle', :subtitle='$t(`auth:pleaseWait`)')
    notify(style='padding-top: 64px;')
</template>

<script>
/* global siteConfig */

// <span>Photo by <a href="https://unsplash.com/@isaacquesada?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Isaac Quesada</a> on <a href="/t/textures-patterns?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a></span>

import _ from 'lodash'
import Cookies from 'js-cookie'
import gql from 'graphql-tag'
import { sync } from 'vuex-pathify'

export default {
  i18nOptions: { namespaces: 'auth' },
  props: {
    bgUrl: {
      type: String,
      default: ''
    },
    hideLocal: {
      type: Boolean,
      default: false
    },
    changePwdContinuationToken: {
      type: String,
      default: null
    }
  },
  data () {
    return {
      error: false,
      strategies: [],
      selectedStrategyKey: 'unselected',
      selectedStrategy: { key: 'unselected', strategy: { useForm: false, usernameType: 'email' } },
      screen: 'login',
      username: '',
      password: '',
      hidePassword: true,
      securityCode: '',
      continuationToken: '',
      isLoading: false,
      loaderColor: 'grey darken-4',
      loaderTitle: 'Working...',
      isShown: false,
      newPassword: '',
      newPasswordVerify: '',
      isTFAShown: false,
      isTFASetupShown: false,
      tfaQRImage: '',
      errorShown: false,
      errorMessage: ''
    }
  },
  computed: {
    activeModal: sync('editor/activeModal'),
    // -> Only an admin-set background: the default splash image does not show
    bgStyle () {
      return this.bgUrl && !this.bgUrl.includes('/_assets/img/splash/') ? { backgroundImage: `url(${this.bgUrl})` } : null
    },
    screenTitle () {
      if (this.screen === 'forgot') { return this.$t('auth:forgotPasswordTitle') }
      if (this.screen === 'changePwd') { return this.$t('auth:changePwd.subtitle') }
      return this.$t('auth:actions.login')
    },
    siteTitle () {
      return siteConfig.title
    },
    isSocialShown () {
      return this.strategies.length > 1
    },
    logoUrl () { return siteConfig.logoUrl },
    filteredStrategies () {
      const qParams = new URLSearchParams(window.location.search)
      if (this.hideLocal && !qParams.has('all')) {
        return _.reject(this.strategies, ['key', 'local'])
      } else {
        return this.strategies
      }
    },
    isUsernameEmail () {
      return this.selectedStrategy.strategy.usernameType === `email`
    }
  },
  watch: {
    filteredStrategies (newValue, oldValue) {
      if (_.get(_.head(newValue), 'strategy.useForm')) {
        this.selectedStrategyKey = _.head(newValue).key
      }
    },
    selectedStrategyKey (newValue, oldValue) {
      this.selectedStrategy = _.find(this.strategies, ['key', newValue])
      if (this.screen === 'changePwd') {
        return
      }
      this.screen = 'login'
      if (!this.selectedStrategy.strategy.useForm) {
        this.isLoading = true
        window.location.assign('/login/' + newValue)
      } else {
        this.$nextTick(() => {
          this.$refs.iptEmail.focus()
        })
      }
    }
  },
  mounted () {
    this.isShown = true
    if (this.changePwdContinuationToken) {
      this.screen = 'changePwd'
      this.continuationToken = this.changePwdContinuationToken
    }
  },
  methods: {
    /**
     * LOGIN
     */
    viaLabel (stg) {
      return this.$t('common:login.via', { defaultValue: 'Đăng nhập bằng {{name}}', name: stg.displayName })
    },
    async login () {
      this.errorShown = false
      if (this.username.length < 2) {
        this.errorMessage = this.$t('auth:invalidEmailUsername')
        this.errorShown = true
        this.$refs.iptEmail.focus()
      } else if (this.password.length < 2) {
        this.errorMessage = this.$t('auth:invalidPassword')
        this.errorShown = true
        this.$refs.iptPassword.focus()
      } else {
        this.loaderColor = 'grey darken-4'
        this.loaderTitle = this.$t('auth:signingIn')
        this.isLoading = true
        try {
          const resp = await this.$apollo.mutate({
            mutation: gql`
              mutation($username: String!, $password: String!, $strategy: String!) {
                authentication {
                  login(username: $username, password: $password, strategy: $strategy) {
                    responseResult {
                      succeeded
                      errorCode
                      slug
                      message
                    }
                    jwt
                    mustChangePwd
                    mustProvideTFA
                    mustSetupTFA
                    continuationToken
                    redirect
                    tfaQRImage
                  }
                }
              }
            `,
            variables: {
              username: this.username,
              password: this.password,
              strategy: this.selectedStrategy.key
            }
          })
          if (_.has(resp, 'data.authentication.login')) {
            const respObj = _.get(resp, 'data.authentication.login', {})
            if (respObj.responseResult.succeeded === true) {
              this.handleLoginResponse(respObj)
            } else {
              throw new Error(respObj.responseResult.message)
            }
          } else {
            throw new Error(this.$t('auth:genericError'))
          }
        } catch (err) {
          console.error(err)
          this.$store.commit('showNotification', {
            style: 'red',
            message: err.message,
            icon: 'alert'
          })
          this.isLoading = false
        }
      }
    },
    /**
     * VERIFY TFA CODE
     */
    async verifySecurityCode (setup = false) {
      if (this.securityCode.length !== 6) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: 'Enter a valid security code.',
          icon: 'alert'
        })
        if (setup) {
          this.$refs.iptTFASetup.focus()
        } else {
          this.$refs.iptTFA.focus()
        }
      } else {
        this.loaderColor = 'grey darken-4'
        this.loaderTitle = this.$t('auth:signingIn')
        this.isLoading = true
        try {
          const resp = await this.$apollo.mutate({
            mutation: gql`
              mutation(
                $continuationToken: String!
                $securityCode: String!
                $setup: Boolean
                ) {
                authentication {
                  loginTFA(
                    continuationToken: $continuationToken
                    securityCode: $securityCode
                    setup: $setup
                    ) {
                    responseResult {
                      succeeded
                      errorCode
                      slug
                      message
                    }
                    jwt
                    mustChangePwd
                    continuationToken
                    redirect
                  }
                }
              }
            `,
            variables: {
              continuationToken: this.continuationToken,
              securityCode: this.securityCode,
              setup
            }
          })
          if (_.has(resp, 'data.authentication.loginTFA')) {
            let respObj = _.get(resp, 'data.authentication.loginTFA', {})
            if (respObj.responseResult.succeeded === true) {
              this.handleLoginResponse(respObj)
            } else {
              if (!setup) {
                this.isTFAShown = false
              }
              throw new Error(respObj.responseResult.message)
            }
          } else {
            throw new Error(this.$t('auth:genericError'))
          }
        } catch (err) {
          console.error(err)
          this.$store.commit('showNotification', {
            style: 'red',
            message: err.message,
            icon: 'alert'
          })
          this.isLoading = false
        }
      }
    },
    /**
     * CHANGE PASSWORD
     */
    async changePassword () {
      this.loaderColor = 'grey darken-4'
      this.loaderTitle = this.$t('auth:changePwd.loading')
      this.isLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $continuationToken: String!
              $newPassword: String!
            ) {
              authentication {
                loginChangePassword (
                  continuationToken: $continuationToken
                  newPassword: $newPassword
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                  jwt
                  continuationToken
                  redirect
                }
              }
            }
          `,
          variables: {
            continuationToken: this.continuationToken,
            newPassword: this.newPassword
          }
        })
        if (_.has(resp, 'data.authentication.loginChangePassword')) {
          let respObj = _.get(resp, 'data.authentication.loginChangePassword', {})
          if (respObj.responseResult.succeeded === true) {
            this.handleLoginResponse(respObj)
          } else {
            throw new Error(respObj.responseResult.message)
          }
        } else {
          throw new Error(this.$t('auth:genericError'))
        }
      } catch (err) {
        console.error(err)
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
        this.isLoading = false
      }
    },
    /**
     * SWITCH TO FORGOT PASSWORD SCREEN
     */
    forgotPassword () {
      this.screen = 'forgot'
      this.$nextTick(() => {
        this.$refs.iptForgotPwdEmail.focus()
      })
    },
    /**
     * FORGOT PASSWORD SUBMIT
     */
    async forgotPasswordSubmit () {
      this.loaderColor = 'grey darken-4'
      this.loaderTitle = this.$t('auth:forgotPasswordLoading')
      this.isLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $email: String!
            ) {
              authentication {
                forgotPassword (
                  email: $email
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
            email: this.username
          }
        })
        if (_.has(resp, 'data.authentication.forgotPassword.responseResult')) {
          let respObj = _.get(resp, 'data.authentication.forgotPassword.responseResult', {})
          if (respObj.succeeded === true) {
            this.$store.commit('showNotification', {
              style: 'success',
              message: this.$t('auth:forgotPasswordSuccess'),
              icon: 'email'
            })
            this.screen = 'login'
          } else {
            throw new Error(respObj.message)
          }
        } else {
          throw new Error(this.$t('auth:genericError'))
        }
      } catch (err) {
        console.error(err)
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isLoading = false
    },
    handleLoginResponse (respObj) {
      this.continuationToken = respObj.continuationToken
      if (respObj.mustChangePwd === true) {
        this.screen = 'changePwd'
        this.$nextTick(() => {
          this.$refs.iptNewPassword.focus()
        })
        this.isLoading = false
      } else if (respObj.mustProvideTFA === true) {
        this.securityCode = ''
        this.isTFAShown = true
        setTimeout(() => {
          this.$refs.iptTFA.focus()
        }, 500)
        this.isLoading = false
      } else if (respObj.mustSetupTFA === true) {
        this.securityCode = ''
        this.isTFASetupShown = true
        this.tfaQRImage = respObj.tfaQRImage
        setTimeout(() => {
          this.$refs.iptTFASetup.focus()
        }, 500)
        this.isLoading = false
      } else {
        this.loaderColor = 'green darken-1'
        this.loaderTitle = this.$t('auth:loginSuccess')
        Cookies.set('jwt', respObj.jwt, { expires: 365 })
        _.delay(() => {
          const loginRedirect = Cookies.get('loginRedirect')
          if (loginRedirect === '/' && respObj.redirect) {
            Cookies.remove('loginRedirect')
            window.location.replace(respObj.redirect)
          } else if (loginRedirect) {
            Cookies.remove('loginRedirect')
            window.location.replace(loginRedirect)
          } else if (respObj.redirect) {
            window.location.replace(respObj.redirect)
          } else {
            window.location.replace('/')
          }
        }, 1000)
      }
    }
  },
  apollo: {
    strategies: {
      query: gql`
        {
          authentication {
            activeStrategies(enabledOnly: true) {
              key
              icon
              strategy {
                key
                logo
                color
                icon
                useForm
                usernameType
              }
              displayName
              order
              selfRegistration
            }
          }
        }
      `,
      update: (data) => _.sortBy(data.authentication.activeStrategies, ['order']),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'login-strategies-refresh')
      }
    }
  }
}
</script>

<style lang="scss">
  // -> One centered card, as the login dialog of the design
  .vn-login {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 16px;
    background-color: var(--bg);
    background-size: cover;
    background-position: center center;
    color: var(--ink);
  }

  .vn-login__box {
    width: min(360px, 100%);
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 28px 24px 24px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    box-shadow: var(--shadow);

    h1 {
      margin: 0 0 8px;
      font-size: 1.25rem;
      font-weight: 700;
    }

    > * {
      width: 100%;
    }

    > .vn-login__logo, > h1 {
      width: auto;
    }
  }

  .vn-login__logo img {
    display: block;
    height: 44px;
    width: auto;
  }

  .vn-login__err.v-alert {
    margin: 0;
    font-size: 0.875rem;
  }

  .vn-login__list, .vn-login__form {
    display: grid;
    gap: 10px;
  }

  .vn-login .vn-btn.is-wide {
    width: 100%;
    justify-content: center;

    &[aria-pressed='true'].is-ghost {
      border-color: var(--accent);
    }
  }

  .vn-login__icon {
    display: inline-grid;
    width: 20px;
    height: 20px;

    svg {
      width: 100%;
      height: 100%;
    }

    &:empty {
      display: none;
    }
  }

  .vn-login__form {
    margin-top: 4px;
  }

  .vn-login__info {
    margin: 0;
    font-size: 0.875rem;
    text-align: center;
    color: var(--muted);
  }

  .vn-login__links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 18px;
    font-size: 0.875rem;

    a {
      color: var(--accent) !important;
    }
  }

  .login {
    &-tfa {
      background-color: #EEE;
      border: 7px solid #FFF;

      &-field input {
        text-align: center;
      }

      &-qr {
        background-color: #FFF;
        padding: 5px;
        border-radius: 5px;
        width: 200px;
        height: 200px;
        margin: 0 auto;
      }
    }
  }
</style>
