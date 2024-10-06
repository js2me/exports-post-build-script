import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const $ = (cmd: string) => {
  try {
    // eslint-disable-next-line sonarjs/os-command
    cp.execSync(cmd, { stdio: 'inherit', shell: '/bin/sh' });
  } catch (error) {
    console.error(`Не удалось выполнить команду - ${cmd}`, error);
  }
};

export const scanDir = (dir: string) => fs.readdirSync(dir);

export const readFile = (file: string) => fs.readFileSync(file);

export const writeFile = (file: string, content: string) =>
  fs.writeFileSync(file, content);

export { cp, fs, path };
