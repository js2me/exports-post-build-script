import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { ConfigsManager } from './configs-manager.js';

export interface PrepareDistDirConfig {
  extraFilesToCopy?: string[];
  binPath?: string;
  configs: ConfigsManager;
  ignoredModuleNamesForExport?: string[];
}

export const prepareDistDir = async (config: PrepareDistDirConfig) => {
  try {
    console.log(
      '\n📦 Preparing dist folder (collecting exports for package.json etc)...\n',
    );

    // Копируем файлы
    const filesToCopy = [
      'LICENSE',
      'README.md',
      'package.json',
      ...(config?.extraFilesToCopy || []),
    ];

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
      if (file.endsWith('.map') || filesToCopy.some((it) => it === file)) {
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

      if (config.ignoredModuleNamesForExport?.some((it) => it === moduleName)) {
        return;
      }

      moduleNames.add(moduleName);
    });

    // Генерируем exports
    const exports: Record<string, any> = {};

    for (const moduleName of Array.from(moduleNames).sort()) {
      const hasJs = existsSync(`dist/${moduleName}.js`);
      const hasCjs = existsSync(`dist/${moduleName}.cjs`);
      const hasDts = existsSync(`dist/${moduleName}.d.ts`);

      const isIndexModule = moduleName === 'index';

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

      const defaultEntry = [exportEntry.import, exportEntry.require].filter(
        Boolean,
      )[0];

      if (defaultEntry) {
        exportEntry.default = defaultEntry;

        // Добавляем main поле только если мы нашли корневой тс файл
        if (
          isIndexModule &&
          config.configs.hasSourceIndexTs &&
          !distConfigs.package.main
        ) {
          if (exportEntry.default.startsWith('./')) {
            distConfigs.package.main = exportEntry.default.slice(2);
          } else {
            distConfigs.package.main = exportEntry.default;
          }
        }
      }

      // Определяем путь экспорта
      const exportPath = isIndexModule ? '.' : `./${moduleName}`;

      if (Object.keys(exportEntry).length < 3) {
        console.warn(
          `⚠️  Strange export entry for ${exportPath} (probably bad import in source code):`,
          exportEntry,
        );
      }

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
};
