import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { type PluginContext, rollup } from 'rollup';
import dts from 'rollup-plugin-dts';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { ConfigsManager } from '../utils/configs-manager.js';

export const defineLibViteConfig = (
  configs: ConfigsManager,
  config?: Partial<UserConfig> & {
    customPluginBeforeFinish?: (
      pluginContext: PluginContext,
      error?: Error,
    ) => Promise<void>;
    binPath?: string;
  },
) => {
  const __dirname = configs.rootPath;

  const entry = Object.fromEntries(
    Object.entries(configs.pathAliasesFromTsConfig).map(([key, [value]]) => {
      const name = key.split('/').pop()!;
      const entryPath = value.startsWith('./') ? value.slice(2) : value;
      return [name, resolve(__dirname, entryPath)];
    }),
  );

  const sourceIndexTs = resolve(__dirname, 'src/index.ts');

  if (existsSync(sourceIndexTs)) {
    entry.index = sourceIndexTs;
  }

  const alias = Object.fromEntries(
    Object.entries(configs.pathAliasesFromTsConfig).map(([key, [value]]) => {
      const entryPath = value.startsWith('./') ? value.slice(2) : value;
      return [key, resolve(__dirname, entryPath)];
    }),
  );

  let dtsGenerationComplete: PromiseWithResolvers<void> | undefined;
  let customScriptBeforeFinish: PromiseWithResolvers<void> | undefined;

  const definedConfig = defineConfig({
    resolve: {
      alias,
    },
    build: {
      lib: {
        entry,
        formats: ['es', 'cjs'],
        fileName: (format, entryName) => {
          return format === 'es' ? `${entryName}.js` : `${entryName}.cjs`;
        },
      },
      rollupOptions: {
        external: configs.externalDeps,
        output: {
          preserveModules: false,
        },
      },
      minify: false,
      sourcemap: true,
    },
    plugins: [
      {
        name: 'dts-bundle',
        apply: 'build',
        buildStart() {
          dtsGenerationComplete = Promise.withResolvers();
        },
        async closeBundle() {
          console.log('\n📦 Generating bundled .d.ts files...\n');

          for (const [name, entryPath] of Object.entries(entry)) {
            try {
              const bundle = await rollup({
                input: entryPath,
                external: (id) => {
                  if (id.includes('node_modules')) {
                    return true;
                  }

                  return configs.externalDeps.some((dep) => id.startsWith(dep));
                },
                plugins: [
                  dts({
                    respectExternal: true,
                    compilerOptions: {
                      paths: configs.pathAliasesFromTsConfig,
                      baseUrl: '.',
                    },
                  }),
                ],
              });

              await bundle.write({
                file: `dist/${name}.d.ts`,
                format: 'es',
              });

              await bundle.close();
              console.log(`✅ ${name}.d.ts`);
            } catch (error) {
              console.error(`❌ Failed to generate ${name}.d.ts:`, error);
            }
          }

          console.log('\n✅ All .d.ts files generated!\n');
          dtsGenerationComplete?.resolve();
        },
      },
      {
        name: 'custom-script-before-finish',
        apply: 'build',
        enforce: 'post',
        buildStart() {
          customScriptBeforeFinish = Promise.withResolvers();
        },
        async closeBundle(error) {
          await dtsGenerationComplete?.promise;

          await config?.customPluginBeforeFinish?.(this, error);

          customScriptBeforeFinish?.resolve();
        },
      },
      {
        name: 'prepare-dist-package',
        apply: 'build',
        enforce: 'post',
        async closeBundle() {
          // Ждём завершения всех предыдущих плагинов
          await dtsGenerationComplete?.promise;
          await customScriptBeforeFinish?.promise;

          try {
            console.log('\n📦 Preparing package.json for dist...\n');

            // Копируем файлы
            const filesToCopy = ['LICENSE', 'README.md', 'package.json'];

            for (const file of filesToCopy) {
              if (existsSync(file)) {
                copyFileSync(file, `dist/${file}`);
                console.log(`📄 Copied ${file}`);
              } else {
                console.warn(`⚠️  ${file} not found, skipping`);
              }
            }

            const distConfigs = ConfigsManager.create('./dist');

            if (config?.binPath) {
              distConfigs.package.bin = config.binPath;
            }

            // Собираем список всех модулей из dist
            const distFiles = readdirSync('dist');

            // Находим все уникальные имена модулей
            const moduleNames = new Set<string>();

            distFiles.forEach((file) => {
              // Пропускаем .map файлы, LICENSE, README.md, package.json
              if (
                file.endsWith('.map') ||
                file === 'LICENSE' ||
                file === 'README.md' ||
                file === 'package.json'
              ) {
                return;
              }

              // Извлекаем имя модуля (убираем расширение)
              let moduleName = file;

              // Убираем расширения в правильном порядке
              if (moduleName.endsWith('.d.ts')) {
                moduleName = moduleName.replace(/\.d\.ts$/, '');
              } else if (moduleName.endsWith('.cjs')) {
                moduleName = moduleName.replace(/\.cjs$/, '');
              } else if (moduleName.endsWith('.js')) {
                moduleName = moduleName.replace(/\.js$/, '');
              } else {
                return; // Пропускаем файлы с другими расширениями
              }

              moduleNames.add(moduleName);
            });

            // Генерируем exports
            const exports: Record<string, any> = {};

            for (const moduleName of Array.from(moduleNames).sort()) {
              const hasJs = existsSync(`dist/${moduleName}.js`);
              const hasCjs = existsSync(`dist/${moduleName}.cjs`);
              const hasDts = existsSync(`dist/${moduleName}.d.ts`);

              const exportEntry: any = {};

              // ВАЖНО: types должен быть первым!
              if (hasDts) {
                exportEntry.types = `./${moduleName}.d.ts`;
              }

              if (hasJs) {
                exportEntry.import = `./${moduleName}.js`;
              }

              if (hasCjs) {
                exportEntry.require = `./${moduleName}.cjs`;
              }

              // Определяем путь экспорта
              const exportPath =
                moduleName === 'index' ? '.' : `./${moduleName}`;
              exports[exportPath] = exportEntry;
            }

            // Обновляем package.json
            distConfigs.package.exports = exports;
            distConfigs.package.files = ['*'];

            // Удаляем ненужные поля для публикации
            delete distConfigs.package.scripts;
            delete distConfigs.package.devDependencies;

            distConfigs.syncConfigs();

            console.log(`✅ Generated exports for ${moduleNames.size} modules`);
            console.log('✅ Updated dist/package.json\n');
          } catch (error) {
            console.error('❌ Failed to prepare dist package:', error);
          }
        },
      },
    ],
  });

  return defineConfig(
    config ? mergeConfig(definedConfig, config) : definedConfig,
  );
};
