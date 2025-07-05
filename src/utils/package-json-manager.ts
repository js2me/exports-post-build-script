import path from 'node:path';

import { readFile, writeFile } from './fs.js';

export class PackageJsonManager {
  data: Record<string, any>;

  get ghRepoData() {
    const [user, packageName] = this.data.repository.url
      .split('github.com/')[1]
      .split('/');

    return {
      user,
      packageName,
    };
  }

  get locationDir() {
    return path.resolve(this.path, '../');
  }

  get repositoryUrl() {
    return `https://github.com/${this.ghRepoData.user}/${this.ghRepoData.packageName}`;
  }

  constructor(
    private path: string,
    data?: Record<string, any>,
  ) {
    this.data = data || JSON.parse(readFile(path).toString());

    if (!this.data.repository) {
      throw new Error(
        'Поле repository обязателен для работы скрипта, нужно его указать',
      );
    }
  }

  syncWithFs() {
    writeFile(this.path, JSON.stringify(this.data, null, 2));
  }

  set(packageJson: Record<string, any>) {
    this.data = packageJson;
    this.syncWithFs();
  }

  update(update: Partial<Record<string, any>>) {
    this.set({
      ...this.data,
      ...update,
    });
  }
}
