import react from '@vitejs/plugin-react-swc';
import { defineConfig, mergeConfig, type UserConfig } from 'vitest/config';
import type { ConfigsManager } from '../utils/configs-manager.js';

export const defineLibVitestConfig = (
  configsManager: ConfigsManager,
  config?: Partial<UserConfig>,
) => {
  const definedConfig: UserConfig = {
    plugins: [react()],
    test: {
      globals: true,
      environment: 'jsdom',
      coverage: {
        provider: 'istanbul', // or 'v8'
        include: ['src'],
        exclude: ['src/preset'],
        reporter: ['text', 'text-summary', 'html'],
        reportsDirectory: './coverage',
      },
    },
    resolve: {
      alias: Object.assign(
        {},
        ...configsManager.entries.map((entry) => {
          return {
            [entry.importName]: entry.entryPath,
          };
        }),
      ),
    },
  };

  return defineConfig(
    config ? mergeConfig(definedConfig, config) : definedConfig,
  );
};
