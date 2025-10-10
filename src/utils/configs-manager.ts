import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
    this.tsconfig = this.readJson(this.tsconfigPath);
    this.package = this.readJson(this.packagePath);
  }

  syncConfigs() {
    writeFileSync(this.tsconfigPath, JSON.stringify(this.tsconfig, null, 2));
    writeFileSync(this.packagePath, JSON.stringify(this.package, null, 2));
  }

  readJson(path: string) {
    return JSON.parse(readFileSync(resolve(this.rootPath, path)).toString());
  }

  static create(rootPath: string, opts?: { tsconfigName?: string }) {
    return new ConfigsManager(rootPath, opts);
  }
}
