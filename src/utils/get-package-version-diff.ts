import { $ } from './fs.js';

const tryToFindPackageVersionChanged = (gitDiffResult: string | undefined) => {
  if (!gitDiffResult) {
    return null;
  }

  const lines = gitDiffResult.split('/n');
  let prevVersion: string | null = null;
  let nextVersion: string | null = null;

  for (const line of lines) {
    if (line.includes('-  "version":')) {
      const rawVersion = line.split('-  "version":')[1];
      const [, version] = rawVersion.split('"');
      prevVersion = version;
    }
    if (line.includes('+  "version":')) {
      const rawVersion = line.split('+  "version":')[1];
      const [, version] = rawVersion.split('"');
      nextVersion = version;

      return { nextVersion, prevVersion };
    }
  }

  return null;
};

export const getPackageVersionDiff = (pathToPathJson: string) => {
  const gitDiffCachedResult = $(
    `git diff --cached ${pathToPathJson} | cat`,
    'pipe',
  );
  const gitDiffResult = $(`git diff ${pathToPathJson} | cat`, 'pipe');

  return (
    tryToFindPackageVersionChanged(gitDiffCachedResult) ??
    tryToFindPackageVersionChanged(gitDiffResult)
  );
};
