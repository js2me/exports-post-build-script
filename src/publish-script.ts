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
}: PublishScriptConfig) => {
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

    $(`git tag -a v${nextVersion} -m "${tagMessage}"`);
    $(`git push origin v${nextVersion}`);
  }

  if (cleanupCommand) {
    $('npm run clean');
  }
};
