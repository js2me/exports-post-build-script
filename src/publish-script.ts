/* eslint-disable sonarjs/cognitive-complexity */
import { execSync } from 'node:child_process';

import { PublishScriptConfig } from './types.js';
import { $ } from './utils/fs.js';

const checkExistedVersion = (packageName: string, version: string) => {
  try {
    // eslint-disable-next-line sonarjs/os-command
    const versionsListJsonString = execSync(
      `npm view ${packageName} version --json`,
      { stdio: 'pipe' },
    ).toString();

    // eslint-disable-next-line sonarjs/os-command
    return versionsListJsonString.includes(version);
  } catch (error) {
    if (
      error &&
      typeof error == 'object' &&
      (error as any).message?.includes(
        `404 Not Found - GET https://registry.npmjs.org/${packageName} - Not found`,
      )
    ) {
      console.warn(`Пакет "${packageName}" не найден в регистри`);
      return false;
    }
    throw error;
  }
};

interface PublishScriptOutput {
  /**
   * ТАКЖЕ ЗАПИСЫВАЕТСЯ В ПЕРЕМЕННУЮ ОКРУЖЕНИЯ
   * PUBLISHED_GIT_TAG
   */
  publishedGitTag: null | string;
}

export const publishScript = ({
  nextVersion,
  commitAllCurrentChanges,
  createTag,
  gitTagFormat = 'v<tag>',
  cleanupCommand,
  packageManager,
  tag,
  force,
  otherNames,
  targetPackageJson,
  onAlreadyPublishedThisVersion,
  safe,
  mainBranch = 'main',
}: PublishScriptConfig): null | PublishScriptOutput => {
  let publishedGitTag: null | string = null;

  if (!targetPackageJson) {
    throw new Error(
      'Для правильной работы otherNames необходим targetPackageJson - которая будет патчить package.json в dist',
    );
  }

  if (
    safe &&
    checkExistedVersion(
      targetPackageJson.data.name,
      targetPackageJson.data.version,
    )
  ) {
    onAlreadyPublishedThisVersion?.();
    return null;
  }

  if (commitAllCurrentChanges) {
    $('git add .');
    if (nextVersion == null) {
      $(`git commit -m "feat: publish last version"`);
    } else {
      const nextTagLabel = gitTagFormat.replaceAll('<tag>', nextVersion);
      $(`git commit -m "feat: ${nextTagLabel} version"`);
    }
    $('git push');
  }

  let publishCommand: string;

  switch (packageManager) {
    case 'pnpm': {
      publishCommand = 'pnpm publish';
      break;
    }
    case 'npm': {
      publishCommand = 'npm publish';
      break;
    }
  }

  if (tag) {
    publishCommand += ` --tag ${tag}`;
  }

  if (force) {
    publishCommand += ` --force`;
  }

  $(`cd dist && ${publishCommand} && cd ..`, undefined, true);

  if (createTag && nextVersion != null) {
    const nextTagLabel = gitTagFormat.replaceAll('<tag>', nextVersion);

    try {
      $(
        `git tag -a ${nextTagLabel} -m "[Changelog](${targetPackageJson.repositoryUrl}/blob/${mainBranch}/CHANGELOG.md#${nextTagLabel.replaceAll(/\.|v|\s/g, '')})"`,
      );
      $(`git push origin ${nextTagLabel}`);

      publishedGitTag = nextTagLabel;
      process.env.PUBLISHED_GIT_TAG = nextTagLabel;
    } catch (error) {
      console.error('не удалось сделать и запушить тег', error);
    }
  }

  if (otherNames?.length && targetPackageJson) {
    const currentName = targetPackageJson.data.name;

    for (const otherName of otherNames) {
      targetPackageJson.update({
        name: otherName,
      });

      $(`cd dist && ${publishCommand} && cd ..`);
    }

    targetPackageJson.update({
      name: currentName,
    });
  }

  if (cleanupCommand) {
    $('npm run clean');
  }

  return {
    publishedGitTag,
  };
};
