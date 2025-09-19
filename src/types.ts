import type * as fsUtils from './utils/fs.js';
import type { PackageJsonManager } from './utils/package-json-manager.js';

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
    targetPackageJson: PackageJsonManager,
    utils: FsUtils,
  ) => void;

  updateVersion?: 'minor' | 'major' | 'patch';
}

export interface PublishScriptConfig {
  nextVersion: string;
  safe?: boolean;
  stayInCurrentDir?: boolean;
  /**
   * @default - `main`
   */
  mainBranch?: string;
  /**
   * works only with `safe` flag
   */
  onAlreadyPublishedThisVersion?: () => void;
  /**
   * Тег для публикации
   */
  tag?: string;
  force?: boolean;
  packageManager: 'pnpm' | 'npm';
  commitAllCurrentChanges?: boolean;
  createTag?: boolean;
  /**
   * This value `<tag>` is required in provided string
   *
   * Default: `v<tag>`,
   *
   * Examples:
   * ```ts
   * gitTagFormat: 'v<tag>',
   * gitTagFormat: '<tag>',
   * gitTagFormat: '<tag>-foo-bar-baz',
   * ```
   */
  gitTagFormat?: string;
  cleanupCommand?: string;
  otherNames?: string;
  targetPackageJson?: PackageJsonManager;
}
