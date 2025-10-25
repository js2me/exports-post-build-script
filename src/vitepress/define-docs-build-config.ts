import { presetAttributify, presetIcons, presetUno } from 'unocss';
import Unocss from 'unocss/vite';
import { defineConfig, mergeConfig } from 'vite';
import type { DefaultTheme, UserConfig } from 'vitepress';
import type { ConfigsManager } from '../utils/configs-manager.js';

export const defineDocsBuildConfig = (
  configs: ConfigsManager,
  config?: UserConfig<DefaultTheme.Config>,
) => {
  const definedConfig = defineConfig({
    base: `/${configs.package.name}/`,
    optimizeDeps: {
      exclude: ['@vueuse/core', 'vitepress'],
    },
    server: {
      hmr: {
        overlay: false,
      },
    },
    define: {
      __PACKAGE_DATA__: JSON.stringify(configs.package),
    },
    plugins: [
      {
        name: 'replace-package-json-vars',
        transform(code, id) {
          if (!id.endsWith('.md')) return;
          return code.replace(/\{packageJson\.(\w+)\}/g, (_, key) => {
            return configs.package[key] || '';
          });
        },
      },
      {
        name: 'replace-source-links',
        transform(code, id) {
          if (!id.endsWith('.md')) return;
          return code.replace(
            /(\(\/src\/)/g,
            `(https://github.com/${configs.package.author}/${configs.package.name}/tree/master/src/`,
          );
        },
      },
      Unocss({
        presets: [
          presetUno({
            dark: 'media',
          }),
          presetAttributify(),
          presetIcons({
            scale: 1.2,
          }),
        ],
      }),
    ],
  });

  if (config) {
    return mergeConfig(definedConfig, config);
  }

  return definedConfig;
};
