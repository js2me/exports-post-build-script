import cp from 'node:child_process';
import fs, { lstatSync } from 'node:fs';
import path from 'node:path';

type FilterExportsPathFunction = (
  path: string,
  targetPath: string,
  extension: string,
) => boolean;

//#region утилиты
const $ = (cmd: string) => {
  try {
    // eslint-disable-next-line sonarjs/os-command
    cp.execSync(cmd, { stdio: 'inherit', shell: 'linux' });
  } catch (error) {
    console.error(`Не удалось выполнить команду - ${cmd}`, error);
  }
};
const scanDir = (dir: string) => fs.readdirSync(dir);
const readFile = (file: string) => fs.readFileSync(file);
const writeFile = (file: string, content: string) =>
  fs.writeFileSync(file, content);
//#endregion

const buildExportsMap = (
  targetPath: string,
  exportsMap: Record<string, any>,
  srcDirName: string,
  filterExportsPathFunction?: FilterExportsPathFunction | undefined | null,
) => {
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

interface PostBuildScriptConfig {
  /**
   * Директория для сборки.
   */
  buildDir: string;
  /**
   *  Корневая директория проекта.
   *  @default .
   */
  rootDir?: string;
  /**
   * Список файлов для копирования.
   * @default []
   */
  filesToCopy?: string[];
  /**
   * Имя директории с исходным кодом.
   * @default src
   */
  srcDirName?: string;
  /**
   * Функция-фильтр для путей экспортов.
   */
  filterExportsPathFn?: FilterExportsPathFunction;
  /**
   * Функция для изменения объекта package.json.
   */
  patchPackageJson?: (packageJson: Record<string, any>) => void;
}

/**
 * Выполняет действия после сборки проекта.
 */
export const postBuildScript = ({
  buildDir,
  rootDir = '.',
  filesToCopy = [],
  srcDirName = 'src',
  filterExportsPathFn = defaultFilterExportsPathFunction,
  patchPackageJson,
}: PostBuildScriptConfig) => {
  const packageJson = JSON.parse(
    readFile(`${rootDir}/package.json`).toString(),
  );

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
