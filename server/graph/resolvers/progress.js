const graphHelper = require('../../helpers/graph')
const progressHelper = require('../../helpers/progress')

/* global WIKI */

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
    }
  }
}
