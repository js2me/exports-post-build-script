import { postBuildScript, publishScript } from './dist/index.js';

postBuildScript({
  buildDir: 'dist',
  rootDir: '.',
  srcDirName: 'src',
  filesToCopy: ['LICENSE', 'README.md'],
  updateVersion: process.env.PUBLISH_VERSION,
  onDone: (versionsDiff, targetPackageJson) => {
    if (process.env.PUBLISH) {
      publishScript({
        targetPackageJson,
        nextVersion: versionsDiff?.next,
        currVersion: versionsDiff?.current,
        packageManager: 'pnpm',
        commitAllCurrentChanges: true,
        createTag: true,
        cleanupCommand: 'npm run clean',
      });
    }
  }
});
