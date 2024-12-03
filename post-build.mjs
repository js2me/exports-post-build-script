import { postBuildScript, publishScript } from './dist/index.js';

postBuildScript({
  buildDir: 'dist',
  rootDir: '.',
  srcDirName: 'src',
  filesToCopy: ['LICENSE', 'README.md'],
  updateVersion: process.env.PUBLISH_VERSION,
  onDone: (versionsDiff) => {
    if (process.env.PUBLISH) {
      publishScript({
        nextVersion: versionsDiff.next,
        currVersion: versionsDiff.current,
        publishCommand: 'pnpm publish',
        commitAllCurrentChanges: true,
        createTag: true,
        githubRepoLink: 'https://github.com/js2me/exports-post-build-script',
        cleanupCommand: 'npm run clean',
      });
    }
  }
});
