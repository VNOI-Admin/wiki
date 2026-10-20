<template lang="pug">
  footer.vn-foot
    .vn-wrap.vn-foot__in
      a.vn-brand.vn-foot__brand(href='/')
        img.vn-brand__logo(:src='logoUrl', alt='')
        span {{ title }}
      nav.vn-foot__links(:aria-label='$t(`common:footer.links`, `Liên kết ngoài`)')
        a.is-ext(
          v-for='link of links'
          :key='link.url'
          :href='link.url'
          target='_blank'
          rel='noopener'
          ) {{ link.name }}
      p.vn-foot__org
        template(v-if='footerOverride')
          span(v-html='footerOverrideRender')
        template(v-else-if='company && company.length > 0 && contentLicense !== ``')
          span(v-if='contentLicense === `alr`') {{ $t('common:footer.copyright', { company: company, year: currentYear, interpolation: { escapeValue: false } }) }}
          span(v-else) {{ $t('common:footer.license', { company: company, license: $t('common:license.' + contentLicense), interpolation: { escapeValue: false } }) }}
        span.vn-foot__powered {{ $t('common:footer.poweredBy') }} #[a(href='https://wiki.js.org', rel='nofollow') Wiki.js]
</template>

<script>
import { get } from 'vuex-pathify'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: true
})

// -> VNOI community links. The main menu is already in the header.
const FOOTER_LINKS = [
  { name: 'Discord', url: 'https://discord.gg/m5rVAz7DXx' },
  { name: 'Facebook', url: 'https://www.facebook.com/groups/163215593699283/' },
  { name: 'VNOJ', url: 'https://oj.vnoi.info/' },
  { name: 'GitHub', url: 'https://github.com/VNOI-Admin/vnoi_wiki' },
  { name: 'Hướng dẫn viết bài', url: 'https://wiki.vnoi.info/vnoi-wiki-format' }
]

export default {
  data() {
    return {
      currentYear: (new Date()).getFullYear(),
      links: FOOTER_LINKS
    }
  },
  computed: {
    title: get('site/title'),
    logoUrl: get('site/logoUrl'),
    company: get('site/company'),
    contentLicense: get('site/contentLicense'),
    footerOverride: get('site/footerOverride'),
    footerOverrideRender () {
      if (!this.footerOverride) { return '' }
      return md.renderInline(this.footerOverride)
    }
  }
}
</script>

<style lang="scss">
.vn-foot {
  margin-top: 24px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.vn-foot__in {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 32px;
  padding-block: 24px;
}

.vn-foot__brand {
  font-size: 1rem;
}

.vn-foot__links {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 24px;
  font-size: 0.9375rem;

  a {
    padding-block: 4px;
    color: var(--muted) !important;
    text-decoration: none !important;

    &:hover {
      color: var(--ink) !important;
    }
  }
}

.vn-foot__org {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0 !important;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 0.8125rem;
  color: var(--muted);

  a {
    color: var(--muted) !important;
  }
}

.vn-foot__powered {
  margin-left: auto;
}

@media (max-width: 640px) {
  .vn-foot__links {
    margin-left: 0;
    flex-basis: 100%;
  }
}
</style>
