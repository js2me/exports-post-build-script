#!/usr/bin/env node

import { cac } from 'cac';
import path from 'path';
import { getInfoFromChangelog } from '../get-info-from-changelog.js';
import { postBuildScript } from '../post-build-script.js';
import { publishGhRelease } from '../publish-gh-release.js';
import { publishScript } from '../publish-script.js';
import { $ } from '../utils/fs.js';
import { PackageJsonManager } from '../utils/package-json-manager.js';

const cli = cac('sborshik');

cli
  .command(
    'fill-dist',
    'Fill dist directory (copies package.json, README.md, LICENSE, assets)',
  )
  .action(() => {
    postBuildScript({
      buildDir: 'dist',
      rootDir: '.',
      srcDirName: 'src',
      filesToCopy: ['LICENSE', 'README.md', 'assets'],
    });
  });

cli
  .command('publish')
  .option('--openDistDir', 'Make publish from dist directory')
  .option(
    '--cleanupCommand <cleanupCommand>',
    'Name of the Cleanup command (pnpm run <cleanupCommand>)',
  )
  .action((options) => {
    if (!process.env.CI) {
      $('pnpm changeset version');
    }

    const pckgJson = new PackageJsonManager(
      path.join(process.cwd(), './package.json'),
    );

    const publishOutput = publishScript({
      gitTagFormat: '<tag>',
      nextVersion: pckgJson.data.version,
      packageManager: 'pnpm',
      commitAllCurrentChanges: true,
      createTag: true,
      safe: true,
      onAlreadyPublishedThisVersion: () => {
        console.warn(`${pckgJson.data.version} already published`);
      },
      cleanupCommand: `pnpm ${options.cleanupCommand ?? 'clean'}`,
      targetPackageJson: pckgJson,
      mainBranch: options.branch ?? 'master',
      stayInCurrentDir: 'openDistDir' in options ? false : true,
    });

    if (process.env.CI) {
      if (publishOutput?.publishedGitTag) {
        const { whatChangesText } = getInfoFromChangelog(
          pckgJson.data.version,
          path.resolve(pckgJson.locationDir, './CHANGELOG.md'),
          pckgJson.repositoryUrl,
        );

        publishGhRelease({
          authToken: process.env.GITHUB_TOKEN!,
          body: whatChangesText,
          owner: pckgJson.ghRepoData.user,
          repo: pckgJson.ghRepoData.packageName,
          version: pckgJson.data.version,
        })
          .then((r) => {
            console.info('published new gh release', r);
          })
          .catch((err) => {
            console.error('failed to publish new gh release', err);
            process.exit(1);
          });
      }
    }
  });

cli.help();

cli.parse();
