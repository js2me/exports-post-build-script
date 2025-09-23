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
  .command('build', 'Build project using "zshy"')
  .option(
    '--fillDist',
    'Fill dist directory (copies package.json, README.md, LICENSE, assets)',
  )
  .action(({ fillDist }) => {
    $('pnpm exec zshy');

    if (!fillDist) {
      return;
    }

    postBuildScript({
      buildDir: 'dist',
      rootDir: '.',
      srcDirName: 'src',
      filesToCopy: ['LICENSE', 'README.md'],
    });

    const pckgJson = new PackageJsonManager(
      path.join(process.cwd(), './dist/package.json'),
    );

    if (pckgJson.data.zshy) {
      delete pckgJson.data.zshy;

      const sourcePckgJson = new PackageJsonManager(
        path.join(process.cwd(), './package.json'),
      );

      delete sourcePckgJson.data.files;
      delete sourcePckgJson.data.exports;
      delete sourcePckgJson.data.main;
      delete sourcePckgJson.data.module;
      delete sourcePckgJson.data.types;

      pckgJson.data.files = ['*'];

      const removeDistFromExport = (
        value: Record<string, any> | string,
      ): string | Record<string, any> => {
        if (typeof value === 'string') {
          return value.replace('./dist/', './');
        } else {
          return Object.fromEntries(
            Object.entries(value).map(([key, value]) => [
              key,
              removeDistFromExport(value),
            ]),
          );
        }
      };

      if (pckgJson.data.main) {
        pckgJson.data.main = removeDistFromExport(pckgJson.data.main);
      }

      if (pckgJson.data.module) {
        pckgJson.data.module = removeDistFromExport(pckgJson.data.module);
      }

      if (pckgJson.data.types) {
        pckgJson.data.types = removeDistFromExport(pckgJson.data.types);
      }

      if (pckgJson.data.exports) {
        Object.entries(pckgJson.data.exports).forEach(([key, value]) => {
          pckgJson.data.exports[key] = removeDistFromExport(value as any);
        });
      }

      pckgJson.syncWithFs();
      sourcePckgJson.syncWithFs();
    }
  });

cli
  .command('publish')
  .option('--useDistDir', 'Make publish from dist directory')
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
      stayInCurrentDir: 'useDistDir' in options ? false : true,
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
