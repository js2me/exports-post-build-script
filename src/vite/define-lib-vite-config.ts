import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import dts from 'vite-plugin-dts';
import type { ConfigsManager } from '../utils/configs-manager.js';

export const defineLibViteConfig = (
  configsManager: ConfigsManager,
  config?: Partial<UserConfig>,
) => {
  let yummiesPackageJson: Record<string, any> | null = null;

  try {
    yummiesPackageJson = configsManager.readJson(
      './node_modules/yummies/package.json',
    );
  } catch (_) {}

  const definedConfig: UserConfig = {
    appType: 'spa',
    build: {
      minify: 'terser',
      sourcemap: true,
      lib: {
        entry: Object.assign(
          {},
          ...configsManager.entries.map((entry) => ({
            [entry.relativeName]: entry.entryPath,
          })),
        ),
        formats: ['es', 'cjs'],
      },
      rollupOptions: {
        external: [
          ...configsManager.entries.map((entry) => entry.importName),
          ...Object.keys(configsManager.package.peerDependencies ?? {}),
          ...Object.keys(configsManager.package.dependencies ?? {}),
          ...Object.keys(yummiesPackageJson?.exports ?? {}).map((key) =>
            key.replace('./', 'yummies/'),
          ),
        ],
        output: {
          chunkFileNames: '~[name]-[hash].js',
        },
      },
    },
    resolve: {},
    plugins: [dts()],
  };

  return defineConfig(
    config ? mergeConfig(definedConfig, config) : definedConfig,
  );
};
