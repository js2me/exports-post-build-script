import { postBuildScript, publishScript } from './dist/index.js';

postBuildScript({
  buildDir: 'dist',
  rootDir: '.',
  srcDirName: 'src',
  filesToCopy: ['LICENSE', 'README.md'],
  onPackageVersionChanged: (nextVersion, prevVersion, { $ }) => {
    if (process.env.PUBLISH) {
      publishScript({
        nextVersion,
        prevVersion,
        publishCommand: 'pnpm publish',
        commitAllCurrentChanges: true,
        createTag: true,
        cleanupCommand: 'npm run clean',  
      });
    }
  }
});
