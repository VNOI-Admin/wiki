const _ = require('lodash')

/* global WIKI */

// ------------------------------------
// OpenID Connect Account
// ------------------------------------

const OpenIDConnectStrategy = require('passport-openidconnect').Strategy

module.exports = {
  init (passport, conf) {
    passport.use(conf.key,
      new OpenIDConnectStrategy({
        authorizationURL: conf.authorizationURL,
        tokenURL: conf.tokenURL,
        clientID: conf.clientId,
        clientSecret: conf.clientSecret,
        issuer: conf.issuer,
        userInfoURL: conf.userInfoURL,
        callbackURL: conf.callbackURL,
        passReqToCallback: true,
        skipUserProfile: conf.skipUserProfile,
        acrValues: conf.acrValues
      }, async (req, iss, uiProfile, idProfile, context, idToken, accessToken, refreshToken, params, cb) => {
        const profile = Object.assign({}, idProfile, uiProfile)

        try {
          const user = await WIKI.models.users.processProfile({
            providerKey: req.params.strategy,
            profile: {
              ...profile,
              email: _.get(profile, '_json.' + conf.emailClaim),
              displayName: _.get(profile, '_json.' + conf.displayNameClaim, '')
            }
          })
          if (conf.mapGroups) {
            const groups = _.get(profile, '_json.' + conf.groupsClaim)
            if (groups && _.isArray(groups)) {
              const currentGroups = (await user.$relatedQuery('groups').select('groups.id')).map(g => g.id)
              const expectedGroups = Object.values(WIKI.auth.groups).filter(g => groups.includes(g.name)).map(g => g.id)
              for (const groupId of _.difference(expectedGroups, currentGroups)) {
                await user.$relatedQuery('groups').relate(groupId)
              }
              for (const groupId of _.difference(currentGroups, expectedGroups)) {
                await user.$relatedQuery('groups').unrelate().where('groupId', groupId)
              }
            }
          }
          if (conf.mapPermissions) {
            const permissions = _.get(profile, '_json.' + conf.permissionsClaim)
            const permMap = JSON.parse(conf.permissionsGroupMap || '{}')
            if (permissions && _.isArray(permissions) && Object.keys(permMap).length > 0) {
              const mappedGroupNames = new Set(Object.values(permMap))
              const currentGroups = (await user.$relatedQuery('groups').select('groups.id')).map(g => g.id)
              const allGroups = Object.values(WIKI.auth.groups)
              const expectedGroups = allGroups
                .filter(g => mappedGroupNames.has(g.name) && permissions.some(p => permMap[p] === g.name))
                .map(g => g.id)
              const managedGroupIds = allGroups.filter(g => mappedGroupNames.has(g.name)).map(g => g.id)
              for (const groupId of _.difference(expectedGroups, currentGroups)) {
                await user.$relatedQuery('groups').relate(groupId)
              }
              for (const groupId of _.difference(_.intersection(currentGroups, managedGroupIds), expectedGroups)) {
                await user.$relatedQuery('groups').unrelate().where('groupId', groupId)
              }
            }
          }
          cb(null, user)
        } catch (err) {
          cb(err, null)
        }
      })
    )
  },
  logout (conf) {
    if (!conf.logoutURL) {
      return '/'
    } else {
      return conf.logoutURL
    }
  }
}
