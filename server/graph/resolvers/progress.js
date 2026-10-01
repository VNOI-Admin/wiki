const graphHelper = require('../../helpers/graph')
const progressHelper = require('../../helpers/progress')

/* global WIKI */

/**
 * @param {Object} context GraphQL context
 * @returns {number|null} The logged-in user's id, or null for guests
 */
function getAccountUserId (context) {
  const user = context.req.user
  if (!user || user.id < 1 || user.id === 2) { return null }
  return user.id
}

module.exports = {
  Query: {
    async progress() { return {} }
  },
  Mutation: {
    async progress() { return {} }
  },
  ProgressQuery: {
    async config(obj, args, context, info) {
      return progressHelper.getConfig()
    },
    async mine(obj, args, context, info) {
      // -> null rather than an error: the client shows a toast for every GraphQL error
      const userId = getAccountUserId(context)
      if (!userId) { return null }
      return JSON.stringify(await progressHelper.loadUserRecords(userId))
    }
  },
  ProgressMutation: {
    async setConfig(obj, args, context, info) {
      try {
        // -> Normalize server-side: this config is injected into siteConfig on every
        //    page, so a malformed status list would break the client boot site-wide.
        WIKI.config.progress = {
          ...WIKI.config.progress,
          isEnabled: args.isEnabled,
          showLinkMarkers: args.showLinkMarkers,
          statuses: progressHelper.normalizeStatuses(args.statuses)
        }

        await WIKI.configSvc.saveToDb(['progress'])

        return {
          responseResult: graphHelper.generateSuccess('Progress tracking config updated')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async save(obj, args, context, info) {
      try {
        const userId = getAccountUserId(context)
        if (!userId) {
          throw new WIKI.Error.AuthRequired()
        }
        let raw = null
        try {
          raw = JSON.parse(args.records)
        } catch (err) {
          throw new WIKI.Error.InputInvalid()
        }
        if (!Array.isArray(raw)) {
          throw new WIKI.Error.InputInvalid()
        }
        const records = await progressHelper.saveUserRecords(userId, raw, { merge: args.merge === true })
        return {
          responseResult: graphHelper.generateSuccess('Progress saved'),
          records: JSON.stringify(records)
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
