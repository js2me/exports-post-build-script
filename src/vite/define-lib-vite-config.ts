import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { postBuildScript } from '../post-build-script.js';
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
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          '@types/react',
          '@types/react-dom',
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
    plugins: [
      dts({
        tsconfigPath: configsManager.tsconfigPath,
      }),
      {
        name: 'post-build-fill-dist',
        writeBundle(options) {
          postBuildScript({
            buildDir: options.dir!,
            rootDir: '.',
            srcDirName: 'src',
            useBuildDirForExportsMap: true,
            filterExportsPathFn: (path) => {
              return path.startsWith('~');
            },
            onDone: (_, pckgJson) => {
              const subimports = configsManager.entries
                .filter((entry) => {
                  const kek = entry.entryPath.replace(
                    `${configsManager.sourceCodeRelativeDir}/`,
                    '',
                  );
                  return kek.split('/').length > 1;
                })
                .map((entry) => {
                  return `./${entry.importName.split('/').slice(1).join('/')}`;
                });
              const subimportsSet = new Set(subimports);
              Object.keys(pckgJson.data.exports).forEach((exportPath) => {
                if (typeof pckgJson.data.exports[exportPath] !== 'object') {
                  return;
                }
                if (exportPath === './index') {
                  const exportMap = pckgJson.data.exports[exportPath];
                  delete pckgJson.data.exports[exportPath];
                  pckgJson.data.exports['.'] = exportMap;
                  exportPath = '.';
                }
                if (!pckgJson.data.exports[exportPath].require) {
                  pckgJson.data.exports[exportPath].require =
                    pckgJson.data.exports[exportPath].import.replace(
                      '.js',
                      '.cjs',
                    );
                }
                if (subimportsSet.has(exportPath)) {
                  pckgJson.data.exports[exportPath].types =
                    `${exportPath}/index.d.ts`;
                }
              });
              pckgJson.syncWithFs();
            },
            addRequireToExportsMap: true,
            filesToCopy: ['LICENSE', 'README.md'],
          });
        },
      },
    ],
  };

  return defineConfig(
    config ? mergeConfig(definedConfig, config) : definedConfig,
  );
};
