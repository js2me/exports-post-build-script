import { buildExportsMap } from './build-exports-map.js';
import type {
  FilterExportsPathFunction,
  PostBuildScriptConfig,
} from './types.js';
import * as utils from './utils/fs.js';
import { getPackageVersionDiff } from './utils/get-package-version-diff.js';
import { PackageJsonManager } from './utils/package-json-manager.js';
import { updatePackageVersion } from './utils/update-package-version.js';

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
  useBuildDirForExportsMap,
}: PostBuildScriptConfig) => {
  const packageJson = new PackageJsonManager(`${rootDir}/package.json`);

  filesToCopy?.forEach((file) => {
    utils.$(`cp -r ${file} ${buildDir}`);
  });

  const exportsMap: Record<string, any> = {
    ...(packageJson.data.exports ??
      buildExportsMap(
        useBuildDirForExportsMap ? buildDir : srcDirName,
        {},
        useBuildDirForExportsMap ? buildDir : srcDirName,
        filterExportsPathFn || defaultFilterExportsPathFunction,
      )!),
    './package.json': './package.json',
  };

  const rootExport = exportsMap['.'];

  const targetPackageJson = new PackageJsonManager(`${buildDir}/package.json`, {
    ...packageJson.data,
    exports: exportsMap,
    files: packageJson.data.files ?? ['*'],
  });

  if (rootExport) {
    if (typeof rootExport === 'string' && !targetPackageJson.data.main) {
      targetPackageJson.data.main = rootExport;
    } else if (
      !targetPackageJson.data.main &&
      !targetPackageJson.data.typings
    ) {
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
      targetPackageJson,
      utils,
    );
  }
};
