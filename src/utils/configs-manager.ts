import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path, { resolve } from 'node:path';

interface EntryItem {
  /**
   * mobx-tanstack-query
   */
  importName: string;
  /**
   * index
   */
  relativeName: string;
  /**
   * ./src/index.ts
   */
  entryPath: string;
}

export class ConfigsManager {
  rootPath: string;
  tsconfigPath: string;
  packagePath: string;
  sourceCodeRelativeDir: string;
  sourceCodeFullDir: string;

  package!: Record<string, any>;
  tsconfig!: Record<string, any>;

  private cache = new Map<string, any>();

  private constructor(
    rootPath?: string,
    opts?: { tsconfigName?: string; sourceCodeDir?: string },
  ) {
    this.rootPath = rootPath ?? process.cwd();
    this.sourceCodeRelativeDir = opts?.sourceCodeDir ?? './src';
    this.sourceCodeFullDir = resolve(this.rootPath, this.sourceCodeRelativeDir);
    this.tsconfigPath = resolve(
      this.rootPath,
      `./${opts?.tsconfigName ?? 'tsconfig'}.json`,
    );
    this.packagePath = resolve(this.rootPath, `./package.json`);
    this.refreshConfigs();
  }

  get ghRepoData() {
    // git://github.com/js2me/mobx-route
    const [user, packageName] =
      this.package.repository?.url?.split('github.com/')?.[1]?.split?.('/') ??
      [];

    if (!user) {
      return {
        user: '',
        packageName: this.package.name,
      };
    }

    return {
      user,
      packageName,
    };
  }

  get repositoryUrl() {
    return `https://github.com/${this.ghRepoData.user}/${this.ghRepoData.packageName}`;
  }

  get entries(): EntryItem[] {
    if (!this.tsconfig.compilerOptions.paths) {
      return [
        {
          importName: this.package.name,
          relativeName: 'index',
          entryPath: `${this.sourceCodeRelativeDir}/index.ts`,
        },
      ];
    }

    return Object.entries(this.tsconfig.compilerOptions.paths).map(
      ([importName, paths]): EntryItem => {
        const entryPath = (paths as string[])?.[0];
        const entryName = entryPath
          .replace('/index.ts', '')
          .replace('.tsx', '')
          .replace('.ts', '')
          .replace('./src/', '');

        return {
          importName,
          relativeName: entryName === './src' ? 'index' : entryName,
          entryPath: resolve(this.rootPath, entryPath),
        };
      },
    );
  }

  refreshConfigs() {
    try {
      this.package = this.readJson(this.packagePath);
    } catch (_) {
      this.package = null as any;
    }
    try {
      this.tsconfig = this.readJson(this.tsconfigPath);
    } catch (_) {
      this.tsconfig = null as any;
    }
  }

  syncConfigs() {
    if (this.tsconfig) {
      writeFileSync(this.tsconfigPath, JSON.stringify(this.tsconfig, null, 2));
    }

    if (this.package) {
      writeFileSync(this.packagePath, JSON.stringify(this.package, null, 2));
    }
  }

  readJson(path: string) {
    return JSON.parse(readFileSync(resolve(this.rootPath, path)).toString());
  }

  get externalDeps(): string[] {
    if (this.cache.has('external-deps')) {
      return this.cache.get('external-deps')!;
    }

    function collectAllDependencies(
      pkgPath: string,
      collected = new Set<string>(),
    ): Set<string> {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

        const allDeps = {
          ...pkg.dependencies,
          ...pkg.peerDependencies,
        };

        if (pkg.main) {
          collected.add(pkg.name);
        }

        Object.keys(pkg.exports || {}).forEach((exportKey) => {
          const exportPath = exportKey.startsWith('./')
            ? exportKey.slice(2)
            : exportKey;

          if (exportPath === '.') {
            collected.add(pkg.name);
          } else {
            collected.add(`${pkg.name}/${exportPath}`);
          }
        });

        for (const depName of Object.keys(allDeps)) {
          // Пропускаем уже собранные
          if (collected.has(depName)) continue;

          collected.add(depName);

          // Ищем package.json зависимости
          const depPkgPath = path.join('node_modules', depName, 'package.json');

          if (existsSync(depPkgPath)) {
            // Рекурсивно собираем зависимости этой зависимости
            collectAllDependencies(depPkgPath, collected);
          }
        }

        return collected;
      } catch (_) {
        return collected;
      }
    }

    // Собираем все external зависимости
    const allExternalDeps = collectAllDependencies('./package.json');

    const result = [
      ...allExternalDeps,
      ...Object.keys(this.tsconfig?.compilerOptions?.paths || {}),
    ];

    this.cache.set('external-deps', result);

    return result;
  }

  /**
   * @ -> .tsconfig.compilerOptions.paths
   */
  get pathAliasesFromTsConfig(): Record<string, string[]> {
    return (this.tsconfig.compilerOptions.paths || {}) as Record<
      string,
      string[]
    >;
  }

  static create(rootPath?: string, opts?: { tsconfigName?: string }) {
    return new ConfigsManager(rootPath, opts);
  }

  get sourceIndexTs() {
    return resolve(this.rootPath, './src/index.ts');
  }

  get hasSourceIndexTs() {
    return existsSync(this.sourceIndexTs);
  }
}
