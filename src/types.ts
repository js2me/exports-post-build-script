import * as fsUtils from './utils/fs.js';
import { PackageJsonManager } from './utils/package-json-manager.js';

export type FsUtils = typeof fsUtils;

export type FilterExportsPathFunction = (
  path: string,
  targetPath: string,
  extension: string,
) => boolean;

export interface PostBuildScriptConfig {
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

  onPackageVersionChanged?: (
    nextVersion: string,
    currentVersion: string | null,
    utils: FsUtils,
    packageJson: Record<string, any>,
  ) => void;

  onDone?: (
    versionsDiff: null | { next: string; current: string | null },
    utils: FsUtils,
    packageJson: Record<string, any>,
    output: {
      targetPackageJson: PackageJsonManager;
    },
  ) => void;

  updateVersion?: 'minor' | 'major' | 'patch';
}

export interface PublishScriptConfig {
  nextVersion: string;
  currVersion: string | null;
  publishCommand: string;
  commitAllCurrentChanges?: boolean;
  logCommitTags?: string[];
  createTag?: boolean;
  cleanupCommand?: string;
  githubRepoLink: string;
  otherNames?: string;
  targetPackageJson?: PackageJsonManager;
}
