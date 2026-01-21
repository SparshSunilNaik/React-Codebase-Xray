declare module 'madge' {
  interface MadgeResult {
    obj(): Record<string, string[]>;
    circular(): string[][];
    depends(id: string): string[];
    orphans(): string[];
    leaves(): string[];
    warnings(): { skipped: string[] };
    dot(): Promise<string>;
    image(imagePath: string, options?: Record<string, unknown>): Promise<string>;
    svg(): Promise<string>;
  }

  interface MadgeConfig {
    baseDir?: string;
    includeNpm?: boolean;
    fileExtensions?: string[];
    excludeRegExp?: RegExp[];
    requireConfig?: string;
    webpackConfig?: string;
    tsConfig?: string;
    layout?: string;
    rankdir?: string;
    detectiveOptions?: {
      es6?: { mixedImports?: boolean };
      ts?: { mixedImports?: boolean; skipTypeImports?: boolean };
      sass?: { includePaths?: string[] };
    };
  }

  function madge(path: string | string[], config?: MadgeConfig): Promise<MadgeResult>;

  export = madge;
}

declare module 'depcheck' {
  interface Options {
    ignoreBinPackage?: boolean;
    skipMissing?: boolean;
    ignorePatterns?: string[];
    ignoreMatches?: string[];
    parsers?: Record<string, unknown>;
    detectors?: unknown[];
    specials?: unknown[];
    package?: Record<string, unknown>;
  }

  interface Result {
    dependencies: string[];
    devDependencies: string[];
    missing: Record<string, string[]>;
    using: Record<string, string[]>;
    invalidFiles: Record<string, unknown>;
    invalidDirs: Record<string, unknown>;
  }

  function depcheck(rootDir: string, options: Options): Promise<Result>;

  namespace depcheck {
    const parser: {
      jsx: unknown;
      typescript: unknown;
    };
    const detector: {
      requireCallExpression: unknown;
      importDeclaration: unknown;
      exportDeclaration: unknown;
      gruntLoadTaskCallExpression: unknown;
    };
    const special: {
      babel: unknown;
      eslint: unknown;
      webpack: unknown;
    };
    type Options = import('depcheck').Options;
  }

  export = depcheck;
}
