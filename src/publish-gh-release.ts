/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error
import ghRelease from 'gh-release/index.js';

interface PublishGhReleaseConfig {
  version: string;
  body: string;
  draft?: boolean;
  prerelease?: boolean;
  repo: string;
  owner: string;
  authToken: string;
}

export const publishGhRelease = (config: PublishGhReleaseConfig) => {
  return new Promise((resolve, reject) => {
    ghRelease(
      {
        tag_name: config.version,
        name: config.version,
        body: config.body,
        draft: config.draft ?? false,
        prerelease: config.prerelease ?? false,
        repo: config.repo,
        owner: config.owner,
        auth: {
          token: config.authToken,
        },
      },
      (err: any, result: any) => {
        if (err) reject(err);
        resolve(result);
      },
    );
  });
};
