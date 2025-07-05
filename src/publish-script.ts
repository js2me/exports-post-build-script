/* eslint-disable sonarjs/cognitive-complexity */
import { execSync } from 'node:child_process';

import { PublishScriptConfig } from './types.js';
import { $ } from './utils/fs.js';

const checkExistedVersion = (packageName: string, version: string) => {
  // eslint-disable-next-line sonarjs/os-command
  const versionsListJsonString = execSync(
    `npm view ${packageName} version --json`,
    { stdio: 'pipe' },
  ).toString();

  // eslint-disable-next-line sonarjs/os-command
  return versionsListJsonString.includes(version);
};

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
}: PublishScriptConfig): boolean => {
  if (otherNames?.length && !targetPackageJson) {
    throw new Error(
      'Для правильной работы otherNames необходим targetPackageJson - которая будет патчить package.json в dist',
    );
  }

  if (safe) {
    if (!targetPackageJson) {
      throw new Error('Для правильной работы safe необходим targetPackageJson');
    }
    if (
      checkExistedVersion(
        targetPackageJson.data.name,
        targetPackageJson.data.version,
      )
    ) {
      onAlreadyPublishedThisVersion?.();
      return false;
    }
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
      $(`git tag -a ${nextTagLabel}`);
      $(`git push origin ${nextTagLabel}`);
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

  return true;
};
