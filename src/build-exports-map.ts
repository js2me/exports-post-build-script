import type { FilterExportsPathFunction } from './types.js';
import * as utils from './utils/fs.js';

const { fs, path, scanDir } = utils;

export const buildExportsMap = (
  targetPath: string,
  exportsMap: Record<string, any>,
  srcDirName: string,
  filterExportsPathFunction?: FilterExportsPathFunction | undefined | null,
  opts?: { addRequire?: boolean },
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

    const jsExtension = extension.endsWith('cjs') ? '.cjs' : '.js';
    const tsExtension = extension.endsWith('cjs') ? '.cts' : '.ts';

    const isDts = targetPath.endsWith('.d.ts') || targetPath.endsWith('.d.cts');

    if (isDts) {
      return;
    }

    const buildExportObj = () => {
      const exportObj: Record<string, string> = {
        import: `./${fixedPath}${jsExtension}`,
        default: `./${fixedPath}${jsExtension}`,
        types: `./${fixedPath}.d${tsExtension}`,
      };

      if (opts?.addRequire) {
        exportObj.require = `./${fixedPath}.cjs`;
      }

      return exportObj;
    };

    // Проверка, является ли файл TypeScript
    if (extension === '.ts' || extension === '.tsx') {
      // Обработка файла index
      if (fixedPath === 'index') {
        exportsMap[`.`] = buildExportObj();
        // Обработка других файлов с индексом в конце пути
      } else if (fixedPath.endsWith('/index')) {
        exportsMap[`./${fixedPath.split('/').slice(0, -1).join('/')}`] =
          buildExportObj();
      } else {
        exportsMap[`./${fixedPath}`] = buildExportObj();
      }
    } else {
      if (extension.endsWith('.cjs') || extension.endsWith('.js')) {
        exportsMap[`./${fixedPath}`] = buildExportObj();
      } else if (
        [
          '.d.ts',
          '.ts',
          '.map',
          '.ctx',
          '.cts',
          '.d.cts',
          '.d.ts.map',
          '.d.cts.map',
        ].every((ending) => !targetPath.endsWith(ending))
      ) {
        exportsMap[`./${fixedPath}`] = `./${fixedPath}${extension}`;
      }
    }
  }

  return exportsMap;
};
