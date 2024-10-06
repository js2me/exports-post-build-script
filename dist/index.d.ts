type FilterExportsPathFunction = (path: string, targetPath: string, extension: string) => boolean;
interface PostBuildScriptConfig {
    /**
     * Директория для сборки.
     */
    buildDir: string;
    /**
     *  Корневая директория проекта.
     *  @default .
     */
    rootDir?: string;
    /**
     * Список файлов для копирования.
     * @default []
     */
    filesToCopy?: string[];
    /**
     * Имя директории с исходным кодом.
     * @default src
     */
    srcDirName?: string;
    /**
     * Функция-фильтр для путей экспортов.
     */
    filterExportsPathFn?: FilterExportsPathFunction;
    /**
     * Функция для изменения объекта package.json.
     */
    patchPackageJson?: (packageJson: Record<string, any>) => void;
}
/**
 * Выполняет действия после сборки проекта.
 */
export declare const postBuildScript: ({ buildDir, rootDir, filesToCopy, srcDirName, filterExportsPathFn, patchPackageJson, }: PostBuildScriptConfig) => void;
export {};
//# sourceMappingURL=index.d.ts.map