import { readFile, writeFile } from './fs.js';

export class PackageJsonManager {
  data: Record<string, any>;

  constructor(
    private path: string,
    data?: Record<string, any>,
  ) {
    this.data = data || JSON.parse(readFile(path).toString());
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
