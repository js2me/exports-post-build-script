import { PublishScriptConfig } from './types.js';
import { $ } from './utils/fs.js';

export const publishScript = ({
  nextVersion,
  prevVersion,
  publishCommand,
  commitAllCurrentChanges,
  createTag,
  cleanupCommand,
}: PublishScriptConfig) => {
  if (commitAllCurrentChanges) {
    $('git add .');
    $(
      `git commit -m "bump: update to version ${nextVersion} from ${prevVersion}"`,
    );
    $('git push');
  }

  $(`cd dist && ${publishCommand} && cd ..`);

  if (createTag) {
    $(`git tag -a v${nextVersion} -m v${prevVersion}`);
    $(`git push origin v${nextVersion}`);
  }

  if (cleanupCommand) {
    $('npm run clean');
  }
};
