import { $ } from './fs.js';

export const getCommitsBetweenTags = (
  startTag: string | null,
  latestTag: string,
) => {
  let result: string | undefined;

  if (startTag) {
    result = $(
      `git log --no-merges --pretty=format:"%s" '${startTag}^'...${latestTag} | cat`,
      'pipe',
    );
  } else {
    result = $(`git log --no-merges --pretty=format:"%s" | cat`, 'pipe');
  }

  return result?.split('\n') || [];
};
