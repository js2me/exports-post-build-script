import { minify } from 'htmlfy';

import jsdom from 'jsdom';
import { type DefaultTheme, defineConfig, type UserConfig } from 'vitepress';
import type { ConfigsManager } from '../utils/configs-manager.js';

export const defineGhPagesDocConfig = (
  configs: ConfigsManager,
  config: Omit<
    UserConfig<DefaultTheme.Config>,
    'transformHtml' | 'title' | 'base'
  > & { createdYear: string },
) => {
  return defineConfig({
    ...config,
    title: configs.package.name.replace(/-/g, ' '),
    transformHtml(code) {
      const dom = new jsdom.JSDOM(code);
      const htmlDoc = dom.window.document.documentElement;
      const head = dom.window.document.head;

      const descriptionEl = head.querySelector('meta[name="description"]')!;

      const siteUrl = `https://${configs.package.author}.github.io/${configs.package.name}/`;
      const siteTitle = `${configs.package.name}`;
      const siteBannerUrl = `https://${configs.package.author}.github.io/${configs.package.name}/banner.png`;
      const siteDescription =
        configs.package.description ||
        `${configs.package.name} documentation website`;

      descriptionEl.setAttribute('content', siteDescription);
      descriptionEl.setAttribute('property', 'og:description');
      descriptionEl.setAttribute('data-pagefind-index-attrs', 'content');

      type CustomHeadTag = { name: string; attrs?: Record<string, any> };

      const customHeadTags: CustomHeadTag[] = [
        { name: 'link', attrs: { rel: 'canonical', href: siteUrl } },
        { name: 'meta', attrs: { property: 'og:title', content: siteTitle } },
        { name: 'meta', attrs: { property: 'og:type', content: 'article' } },
        { name: 'meta', attrs: { property: 'og:url', content: siteUrl } },
        { name: 'meta', attrs: { property: 'og:locale', content: 'en' } },
        {
          name: 'meta',
          attrs: { property: 'og:image', content: siteBannerUrl },
        },
        {
          name: 'meta',
          attrs: {
            property: 'og:image:alt',
            content: `${configs.package.name} logo`,
          },
        },
        {
          name: 'meta',
          attrs: {
            property: 'og:site_name',
            content: `${configs.package.name}`,
          },
        },
        // Twitter tags
        {
          name: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
        {
          name: 'meta',
          attrs: { name: 'twitter:site', content: `${configs.package.name}` },
        },
        { name: 'meta', attrs: { name: 'twitter:title', content: siteTitle } },
        {
          name: 'meta',
          attrs: { name: 'twitter:description', content: siteDescription },
        },
        {
          name: 'meta',
          attrs: { name: 'twitter:image', content: siteBannerUrl },
        },
        {
          name: 'meta',
          attrs: {
            name: 'twitter:image:alt',
            content: `${configs.package.name} logo`,
          },
        },
      ];

      head.innerHTML = `${head.innerHTML}${customHeadTags
        .map((tag) => {
          return `<${tag.name} ${Object.entries(tag.attrs || {})
            .map(([attr, value]) => `${attr}="${value}"`)
            .join(
              ' ',
            )}${tag.name === 'meta' || tag.name === 'link' ? ' >' : ` ></${tag.name}>`}`;
        })
        .join('\n')}`;

      return minify(htmlDoc.outerHTML);
    },
    base: `/${configs.package.name}/`,
    lastUpdated: true,
    sitemap: {
      hostname: `https://${configs.package.author}.github.io/${configs.package.name}`,
      lastmodDateOnly: false,
    },
    head: [
      ['link', { rel: 'icon', href: `/${configs.package.name}/logo.png` }],
      ...(config.head || []),
    ],
    themeConfig: {
      logo: '/logo.png',
      search: {
        provider: 'local',
      },
      outline: {
        level: [1, 3],
      },
      ...config.themeConfig,
      footer: {
        message: configs.package.license
          ? `Released under the ${configs.package.license} License.`
          : 'No license',
        copyright: `Copyright © ${config.createdYear || '2025'}-PRESENT ${configs.package.author}`,
        ...config.themeConfig?.footer,
      },
      socialLinks: [
        {
          icon: 'github',
          link: `https://github.com/${configs.package.author}/${configs.package.name}`,
        },
        ...(config.themeConfig?.socialLinks || []),
      ],
    },
  });
};
