import { minify } from 'htmlfy';

import jsdom from 'jsdom';
import { defineConfig, type UserConfig } from 'vitepress';

export const defineGhPagesDocConfig = (
  pckgJson: any,
  config: Omit<UserConfig, 'transformHtml' | 'title' | 'base'>,
) => {
  return defineConfig({
    ...config,
    title: pckgJson.name.replace(/-/g, ' '),
    transformHtml(code) {
      const dom = new jsdom.JSDOM(code);
      const htmlDoc = dom.window.document.documentElement;
      const head = dom.window.document.head;

      const descriptionEl = head.querySelector('meta[name="description"]')!;

      const siteUrl = `https://${pckgJson.author}.github.io/${pckgJson.name}/`;
      const siteTitle = `${pckgJson.name}`;
      const siteBannerUrl = `https://${pckgJson.author}.github.io/${pckgJson.name}/banner.png`;
      const siteDescription =
        pckgJson.description || `${pckgJson.name} documentation website`;

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
          attrs: { property: 'og:image:alt', content: `${pckgJson.name} logo` },
        },
        {
          name: 'meta',
          attrs: { property: 'og:site_name', content: `${pckgJson.name}` },
        },
        // Twitter tags
        {
          name: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
        {
          name: 'meta',
          attrs: { name: 'twitter:site', content: `${pckgJson.name}` },
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
            content: `${pckgJson.name} logo`,
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
    base: `/${pckgJson.name}/`,
    head: [
      ['link', { rel: 'icon', href: `/${pckgJson.name}/logo.png` }],
      ...(config.head || []),
    ],
  });
};
