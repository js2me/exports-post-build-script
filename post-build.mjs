import { postBuildScript, publishScript } from './dist/index.js';

postBuildScript({
  buildDir: 'dist',
  rootDir: '.',
  srcDirName: 'src',
  filesToCopy: ['LICENSE', 'README.md'],
  onPackageVersionChanged: (nextVersion, currVersion) => {
    if (process.env.PUBLISH) {
      publishScript({
        nextVersion,
        currVersion,
        publishCommand: 'pnpm publish',
        commitAllCurrentChanges: true,
        createTag: true,
        cleanupCommand: 'npm run clean',  
      });
    }
  }
});
