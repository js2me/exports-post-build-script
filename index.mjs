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
  exportsMap = exportsMap || {};

  const pathstat = lstatSync(targetPath);

  if (pathstat.isDirectory()) {
    const subdirs = scanDir(targetPath);

    subdirs.forEach((subdir) => {
      buildExportsMap(
        `${targetPath}/${subdir}`,
        exportsMap,
        srcDirName,
        filterExportsPathFn,
      );
    });
  } else {
    const ext = path.extname(targetPath);

    const fixedPath = targetPath.replace(ext, '').replace(`${srcDirName}/`, '');

    if (filterExportsPathFn(fixedPath, targetPath, ext)) {
      return;
    }

    if (ext === '.ts' || ext === '.tsx') {
      if (fixedPath === 'index') {
        exportsMap[`.`] = {
          import: `./${fixedPath}.js`,
          default: `./${fixedPath}.js`,
          types: `./${fixedPath}.d.ts`,
        };
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

export const postBuildScript = ({
  buildDir,
  rootDir = '.',
  filesToCopy = [],
  srcDirName = 'src',
  filterExportsPathFn,
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

  writeFile(
    `${buildDir}/package.json`,
    JSON.stringify(patchedPackageJson, null, 2),
  );
};
