/* eslint-disable sonarjs/cognitive-complexity */
import { PublishScriptConfig } from './types.js';
import { $ } from './utils/fs.js';
import { getCommitsFromTagToHead } from './utils/get-commits-from-tag-to-head.js';

export const publishScript = ({
  nextVersion,
  currVersion,
  logCommitTags = [
    'feat',
    'feat',
    'BREAKING_CHANGE',
    'fix',
    'BREAKING CHANGE',
    'Initial commit',
    'initial commit',
  ],
  commitAllCurrentChanges,
  createTag,
  gitTagFormat = 'v<tag>',
  cleanupCommand,
  packageManager,
  tag,
  force,
  githubRepoLink,
  otherNames,
  targetPackageJson,
}: PublishScriptConfig) => {
  if (otherNames?.length && !targetPackageJson) {
    throw new Error(
      'Для правильной работы otherNames необходим targetPackageJson - которая будет патчить package.json в dist',
    );
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
    const currTagLabel =
      currVersion && gitTagFormat.replaceAll('<tag>', currVersion);

    const commits = getCommitsFromTagToHead(currTagLabel).filter((it) =>
      logCommitTags.some((commitTag) => it.startsWith(commitTag)),
    );

    const tagMessageLines: string[] = [
      `## What's Changed`,
      ...commits.map((commit) => `* ${commit}`),
      currVersion
        ? `**Full Changelog**: ${githubRepoLink}/compare/${currTagLabel}...${nextTagLabel}`
        : `**Full Changelog**: ${githubRepoLink}/commits/${nextVersion}`,
    ];

    const tagMessage = tagMessageLines.join('\n');

    try {
      $(`git tag -a ${nextTagLabel} -m "${tagMessage}"`);
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
};
