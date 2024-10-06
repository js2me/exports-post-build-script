import { execSync } from 'child_process';
import fs, { lstatSync } from 'fs';
import path from 'path';

//#region утилиты
const $ = (cmd) => execSync(cmd, { stdio: 'inherit' });
const scanDir = (dir) => fs.readdirSync(dir);
const readFile = (file) => fs.readFileSync(file);
const writeFile = (file, content) => fs.writeFileSync(file, content);
//#endregion

const buildExportsMap = (
  targetPath,
  exportsMap,
  srcDirName,
  filterExportsPathFn,
) => {
  exportsMap = exportsMap || {}; // Инициализация карты экспортов, если она не передана

  const pathstat = lstatSync(targetPath); // Получение информации о файле или директории

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
        filterExportsPathFn,
      );
    });
  } else {
    const ext = path.extname(targetPath);

    // Удаление расширения и имени исходной директории
    const fixedPath = targetPath.replace(ext, '').replace(`${srcDirName}/`, '');

    // Применение фильтра для исключения определенных путей
    if (filterExportsPathFn(fixedPath, targetPath, ext)) {
      return; // Если путь исключен, выходим из функции
    }

    // Проверка, является ли файл TypeScript
    if (ext === '.ts' || ext === '.tsx') {
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
      exportsMap[`./${fixedPath}`] = `./${fixedPath}${ext}`;
    }
  }

  return exportsMap;
};

const defaultFilterExportsPathFn = (path) =>
  path.endsWith('.store') ||
  path.endsWith('.store.types') ||
  path.endsWith('.types') ||
  path.endsWith('.impl');

/**
 * Выполняет действия после сборки проекта.
 *
 * @param {Object} options - Опции для настройки функции.
 * @param {string} options.buildDir - Директория для сборки.
 * @param {string} [options.rootDir='.'] - Корневая директория проекта.
 * @param {Array<string>} [options.filesToCopy=[]] - Список файлов для копирования.
 * @param {string} [options.srcDirName='src'] - Имя директории с исходным кодом.
 * @param {Function} [options.filterExportsPathFn] - Функция-фильтр для путей экспортов.
 * @param {Function} [options.patchPackageJson] - Функция для изменения объекта package.json.
 *
 * @returns {void}
 */
export const postBuildScript = ({
  buildDir,
  rootDir = '.',
  filesToCopy = [],
  srcDirName = 'src',
  filterExportsPathFn,
  patchPackageJson,
}) => {
  const packageJson = JSON.parse(readFile(`${rootDir}/package.json`));

  filesToCopy?.forEach((file) => {
    $(`cp -r ${file} ${buildDir}`);
  });

  const exportsMap = {
    ...buildExportsMap(
      srcDirName,
      {},
      srcDirName,
      filterExportsPathFn || defaultFilterExportsPathFn,
    ),
    './package.json': './package.json',
  };

  const rootExport = exportsMap['.'];

  const patchedPackageJson = {
    ...packageJson,
    exports: exportsMap,
    files: ['*'],
  };

  if (rootExport) {
    if (typeof rootExport === 'string') {
      patchedPackageJson.main = rootExport;
    } else {
      patchedPackageJson.main = rootExport.import;
      patchedPackageJson.typings = rootExport.types;
    }
  }

  patchPackageJson?.(patchedPackageJson);

  writeFile(
    `${buildDir}/package.json`,
    JSON.stringify(patchedPackageJson, null, 2),
  );
};
