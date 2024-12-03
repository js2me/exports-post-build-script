import { FilterExportsPathFunction, PostBuildScriptConfig } from './types.js';
import * as utils from './utils/fs.js';
import { getPackageVersionDiff } from './utils/get-package-version-diff.js';
import { PackageJsonManager } from './utils/package-json-manager.js';
import { updatePackageVersion } from './utils/update-package-version.js';

const { $, fs, path, scanDir } = utils;

const buildExportsMap = (
  targetPath: string,
  exportsMap: Record<string, any>,
  srcDirName: string,
  filterExportsPathFunction?: FilterExportsPathFunction | undefined | null,
) => {
  const pathstat = fs.lstatSync(targetPath); // Получение информации о файле или директории

  if (pathstat.isDirectory()) {
    // Проверка, является ли путь директорией
    const subdirs = scanDir(targetPath); // Сканирование поддиректорий

    // Итерация по каждой поддиректории
    subdirs.forEach((subdir) => {
      // Рекурсивный вызов для каждой поддиректории
      buildExportsMap(
        `${targetPath}/${subdir}`,
        exportsMap,
        srcDirName,
        filterExportsPathFunction,
      );
    });
  } else {
    const extension = path.extname(targetPath);

    // Удаление расширения и имени исходной директории
    const fixedPath = targetPath
      .replace(extension, '')
      .replace(`${srcDirName}/`, '');

    // Применение фильтра для исключения определенных путей
    if (filterExportsPathFunction?.(fixedPath, targetPath, extension)) {
      return; // Если путь исключен, выходим из функции
    }

    // Проверка, является ли файл TypeScript
    if (extension === '.ts' || extension === '.tsx') {
      // Обработка файла index
      if (fixedPath === 'index') {
        exportsMap[`.`] = {
          import: `./${fixedPath}.js`,
          default: `./${fixedPath}.js`,
          types: `./${fixedPath}.d.ts`,
        };
        // Обработка других файлов с индексом в конце пути
      } else if (fixedPath.endsWith('/index')) {
        exportsMap[`./${fixedPath.split('/').slice(0, -1).join('/')}`] = {
          import: `./${fixedPath}.js`,
          default: `./${fixedPath}.js`,
          types: `./${fixedPath}.d.ts`,
        };
      } else {
        exportsMap[`./${fixedPath}`] = {
          import: `./${fixedPath}.js`,
          default: `./${fixedPath}.js`,
          types: `./${fixedPath}.d.ts`,
        };
      }
    } else {
      exportsMap[`./${fixedPath}`] = `./${fixedPath}${extension}`;
    }
  }

  return exportsMap;
};

const defaultFilterExportsPathFunction: FilterExportsPathFunction = (path) =>
  path.endsWith('.store') ||
  path.endsWith('.store.types') ||
  path.endsWith('.types') ||
  path.endsWith('.impl');

/**
 * Выполняет действия после сборки проекта.
 */
export const postBuildScript = ({
  buildDir,
  rootDir = '.',
  filesToCopy = [],
  srcDirName = 'src',
  filterExportsPathFn = defaultFilterExportsPathFunction,
  onPackageVersionChanged,
  updateVersion,
  onDone,
}: PostBuildScriptConfig) => {
  const packageJson = new PackageJsonManager(`${rootDir}/package.json`);

  filesToCopy?.forEach((file) => {
    $(`cp -r ${file} ${buildDir}`);
  });

  const exportsMap: Record<string, any> = {
    ...buildExportsMap(
      srcDirName,
      {},
      srcDirName,
      filterExportsPathFn || defaultFilterExportsPathFunction,
    )!,
    './package.json': './package.json',
  };

  const rootExport = exportsMap['.'];

  const targetPackageJson = new PackageJsonManager(`${buildDir}/package.json`, {
    ...packageJson.data,
    exports: exportsMap,
    files: ['*'],
  });

  if (rootExport) {
    if (typeof rootExport === 'string') {
      targetPackageJson.data.main = rootExport;
    } else {
      targetPackageJson.data.main = rootExport.import;
      targetPackageJson.data.typings = rootExport.types;
    }
  }

  targetPackageJson.syncWithFs();

  let versionsDiff = getPackageVersionDiff(`${rootDir}/package.json`);

  if (!versionsDiff && updateVersion) {
    switch (updateVersion) {
      case 'major': {
        const nextVersion = updatePackageVersion(
          packageJson.data.version,
          'major',
        );
        packageJson.update({ version: nextVersion });
        targetPackageJson.update({ version: nextVersion });
        break;
      }
      case 'minor': {
        const nextVersion = updatePackageVersion(
          packageJson.data.version,
          'minor',
        );
        packageJson.update({ version: nextVersion });
        targetPackageJson.update({ version: nextVersion });
        break;
      }
      case 'patch': {
        const nextVersion = updatePackageVersion(
          packageJson.data.version,
          'patch',
        );
        packageJson.update({ version: nextVersion });
        targetPackageJson.update({ version: nextVersion });
        break;
      }
      default: {
        break;
      }
    }
    versionsDiff = getPackageVersionDiff(`${rootDir}/package.json`);
  }

  if (versionsDiff) {
    onPackageVersionChanged?.(
      versionsDiff.nextVersion,
      versionsDiff.prevVersion,
      utils,
      packageJson,
    );
  } else {
    console.info('Версии пакета не изменились');
  }

  if (onDone) {
    onDone(
      versionsDiff && {
        current: versionsDiff.prevVersion,
        next: versionsDiff.nextVersion,
      },
      utils,
      packageJson.data,
      {
        targetPackageJson,
      },
    );
  }
};
