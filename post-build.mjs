import { postBuildScript } from './dist/index.js';

postBuildScript({
  buildDir: 'dist',
  rootDir: '.',
  srcDirName: 'src',
  filesToCopy: ['LICENSE', 'README.md'],
  onPackageVersionChanged: (next, prev, { $ }) => {
    if (process.env.PUBLISH) {
      $('git add .');
      $(`git commit -m "bump: update to version ${next} from ${prev}"`);
      $('cd dist');
      $('pnpm publish');
    }
  }
});
