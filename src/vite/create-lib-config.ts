import { readFileSync } from 'node:fs';
import { copyFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { defineConfig, type UserConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

export const createViteLibConfig = ({
  entry = 'src/index.ts',
  entryRoot = 'src',
  fileName,
}: {
  entry?: string;
  entryRoot?: string;
  fileName?: string;
}): UserConfig & { test: Record<string, any> } => {
  const packageJsonStr = readFileSync('package.json', 'utf-8');
  const packageJson = JSON.parse(packageJsonStr);

  return {
    ...defineConfig({
      plugins: [
        tsconfigPaths(),
        dts({
          entryRoot,
          tsconfigPath: 'tsconfig.json',
          rollupTypes: true,
          async afterBuild() {
            const files = await readdir('dist');
            const dtsFiles = files.filter((file) => file.endsWith('.d.ts'));
            await Promise.all(
              dtsFiles.map((file) =>
                copyFile(
                  path.join('dist', file),
                  path.join('dist', file.replace('.d.ts', '.d.cts')),
                ),
              ),
            );
          },
        }),
      ],
      build: {
        lib: {
          entry,
          name: packageJson.name,
          fileName: fileName,
          formats: ['es', 'cjs'],
        },
        rollupOptions: {
          external: [
            ...Object.keys(packageJson.peerDependencies ?? {}),
            ...Object.keys(packageJson.dependencies ?? {}),
          ],
        },
      },
    }),
    test: {
      typecheck: {
        ignoreSourceErrors: true,
      },
    },
  };
};
