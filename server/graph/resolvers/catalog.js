const catalogHelper = require('../../helpers/catalog')

/* global WIKI */

module.exports = {
  Query: {
    async catalog () { return {} }
  },
  CatalogQuery: {
    // -> The catalogue titles need read access to the catalogue page; the roadmap items do not
    async searchIndex (obj, { locale }, context) {
      const canReadCatalog = WIKI.auth.checkAccess(context.req.user, ['read:pages'], { path: catalogHelper.CATALOG_PATH, locale })
      return catalogHelper.getSearchIndex(locale, canReadCatalog)
    }
  }
}
