const catalogHelper = require('../../helpers/catalog')

/* global WIKI */

module.exports = {
  Query: {
    async catalog () { return {} }
  },
  CatalogQuery: {
    // -> The same rules as the pages: the catalogue page for the titles, /roadmaps for the roadmap items
    async searchIndex (obj, { locale }, context) {
      const canReadCatalog = WIKI.auth.checkAccess(context.req.user, ['read:pages'], { path: catalogHelper.CATALOG_PATH, locale })
      const canReadRoadmaps = WIKI.auth.checkAccess(context.req.user, ['read:pages'])
      return catalogHelper.getSearchIndex(locale, canReadCatalog, canReadRoadmaps)
    }
  }
}
