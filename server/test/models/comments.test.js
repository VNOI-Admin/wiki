const Comment = require('../../models/comments')

/* global WIKI */

const PAGE = { path: 'algo/x', localeCode: 'vi', tags: [] }

// -> A user with these permissions on every page
const userWith = (id, perms) => ({ id, perms })

describe('models/comments/canChange', () => {
  beforeEach(() => {
    global.WIKI = {
      auth: {
        checkAccess: (user, [perm]) => Boolean(user && user.perms.includes(perm))
      },
      data: {
        commentProvider: {
          getCommentById: async id => (id === 7 ? { id: 7, pageId: 1, authorId: 10 } : null)
        }
      }
    }
  })

  it('lets a moderator change every comment', async () => {
    expect(await Comment.canChange({ id: 7, page: PAGE, user: userWith(99, ['manage:comments']) })).toBe(true)
  })

  it('lets an author change only their own comment', async () => {
    const author = userWith(10, ['write:comments'])
    const other = userWith(11, ['write:comments'])
    expect(await Comment.canChange({ id: 7, page: PAGE, user: author })).toBe(true)
    expect(await Comment.canChange({ id: 7, page: PAGE, user: other })).toBe(false)
    expect(await Comment.canChange({ id: 8, page: PAGE, user: author })).toBe(false)
  })

  it('refuses an author without write access, and the shared guest account', async () => {
    expect(await Comment.canChange({ id: 7, page: PAGE, user: userWith(10, ['read:comments']) })).toBe(false)
    WIKI.data.commentProvider.getCommentById = async () => ({ id: 7, pageId: 1, authorId: 2 })
    expect(await Comment.canChange({ id: 7, page: PAGE, user: userWith(2, ['write:comments']) })).toBe(false)
  })
})
