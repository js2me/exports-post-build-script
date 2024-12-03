import { PublishScriptConfig } from './types.js';
import { $ } from './utils/fs.js';
import { getCommitsFromTagToHead } from './utils/get-commits-from-tag-to-head.js';

export const publishScript = ({
  nextVersion,
  currVersion,
  publishCommand,
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
  cleanupCommand,
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
    $(`git commit -m "bump: v${nextVersion}"`);
    $('git push');
  }

  $(`cd dist && ${publishCommand} && cd ..`);

  if (createTag) {
    const commits = getCommitsFromTagToHead(
      currVersion && `v${currVersion}`,
    ).filter((it) =>
      logCommitTags.some((commitTag) => it.startsWith(commitTag)),
    );

    const tagMessageLines: string[] = [
      `## What's Changed`,
      ...commits.map((commit) => `* ${commit}`),
      currVersion
        ? `**Full Changelog**: ${githubRepoLink}/compare/v${currVersion}...v${nextVersion}`
        : `**Full Changelog**: ${githubRepoLink}/commits/${nextVersion}`,
    ];

    const tagMessage = tagMessageLines.join('\n');

    try {
      $(`git tag -a v${nextVersion} -m "${tagMessage}"`);
      $(`git push origin v${nextVersion}`);
    } catch (error) {
      console.error('не удалось сделать и запушить тег', error);
    }
  }

  if (otherNames?.length && targetPackageJson) {
    $(`cd dist`);

    const currentName = targetPackageJson.data.name;

    for (const otherName of otherNames) {
      targetPackageJson.update({
        name: otherName,
      });

      $(publishCommand);
    }

    targetPackageJson.update({
      name: currentName,
    });

    $(`cd ..`);
  }

  if (cleanupCommand) {
    $('npm run clean');
  }
};
