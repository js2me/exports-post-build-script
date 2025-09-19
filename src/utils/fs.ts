import cp, { type StdioOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const $ = (
  cmd: string,
  stdio: StdioOptions = 'inherit',
  throwOnError?: boolean,
  onError?: () => void,
  test?: boolean,
) => {
  try {
    if (test) {
      console.log(`test command exec: ${cmd}`);
      return '';
    } else {
      // eslint-disable-next-line sonarjs/os-command
      return cp.execSync(cmd, { stdio, shell: '/bin/sh' })?.toString();
    }
  } catch (error) {
    console.error(`Не удалось выполнить команду - ${cmd}`, error);
    onError?.();
    if (throwOnError) {
      throw error;
    }
  }
};

export const scanDir = (dir: string) => fs.readdirSync(dir);

export const readFile = (file: string) => fs.readFileSync(file);

export const writeFile = (file: string, content: string) =>
  fs.writeFileSync(file, content);

export { cp, fs, path };
