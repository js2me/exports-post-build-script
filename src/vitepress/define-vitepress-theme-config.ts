// https://vitepress.dev/guide/custom-theme

import type { Theme } from 'vitepress';
import * as DefaultTheme from 'vitepress/theme';
import { h } from 'vue';

export const defineVitepressThemeConfig = (upd?: Partial<Theme>) =>
  ({
    extends: DefaultTheme.default,
    ...upd,
    Layout: () => {
      return h(DefaultTheme.default.Layout, null, {
        // https://vitepress.dev/guide/extending-default-theme#layout-slots
      });
    },
    enhanceApp(cfg) {
      // ...
      upd?.enhanceApp?.(cfg);
    },
  }) satisfies Theme;
