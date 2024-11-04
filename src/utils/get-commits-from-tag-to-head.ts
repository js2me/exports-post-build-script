import { $ } from './fs.js';

export const getCommitsFromTagToHead = (tag: string | null) => {
  let result: string | undefined;

  if (tag) {
    result = $(
      `git log --no-merges --pretty=format:"%s" ${tag}.. | cat`,
      'pipe',
    );
  } else {
    result = $(`git log --no-merges --pretty=format:"%s" | cat`, 'pipe');
  }

  return result?.split('\n') || [];
};
