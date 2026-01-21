/**
 * Unused Dependencies Analyzer
 * Uses depcheck to find unused and missing dependencies
 */

import depcheck from 'depcheck';
import path from 'path';
import type {
    DependencyAnalysisResult,
    UnusedDependency,
    MissingDependency,
} from '@react-codebase-xray/shared';
import {
    pathExists,
    readJsonFile,
} from '@react-codebase-xray/shared';

export interface UnusedDepsOptions {
    projectPath: string;
    ignorePatterns?: string[];
}

/**
 * Analyze unused and missing dependencies
 */
export async function analyzeUnusedDeps(options: UnusedDepsOptions): Promise<DependencyAnalysisResult> {
    const { projectPath, ignorePatterns = [] } = options;

    // Check if package.json exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!await pathExists(packageJsonPath)) {
        return {
            unused: [],
            missing: [],
            totalDependencies: 0,
            totalDevDependencies: 0,
            success: false,
            errorMessage: 'No package.json found in project',
        };
    }

    try {
        // Read package.json for stats
        const packageJson = await readJsonFile<{
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
        }>(packageJsonPath);

        const totalDependencies = Object.keys(packageJson.dependencies || {}).length;
        const totalDevDependencies = Object.keys(packageJson.devDependencies || {}).length;

        // Configure depcheck options
        const depcheckOptions = {
            ignoreBinPackage: false,
            skipMissing: false,
            ignorePatterns: [
                'node_modules',
                'dist',
                'build',
                '.next',
                'coverage',
                ...ignorePatterns,
            ],
            ignoreMatches: [
                // Common packages that are used but depcheck can't detect
                '@types/*',
                'typescript',
                'eslint',
                'prettier',
                'tailwindcss',
                'autoprefixer',
                'postcss',
                'vite',
                'vitest',
                'jest',
                '@jest/*',
                '@testing-library/*',
                'ts-node',
                'tsx',
                'nodemon',
            ],
            parsers: {
                '**/*.js': depcheck.parser.jsx,
                '**/*.jsx': depcheck.parser.jsx,
                '**/*.ts': depcheck.parser.typescript,
                '**/*.tsx': depcheck.parser.typescript,
            },
            detectors: [
                depcheck.detector.requireCallExpression,
                depcheck.detector.importDeclaration,
                depcheck.detector.exportDeclaration,
                depcheck.detector.gruntLoadTaskCallExpression,
            ],
            specials: [
                depcheck.special.babel,
                depcheck.special.eslint,
                depcheck.special.webpack,
            ],
        };

        // Run depcheck
        const result = await depcheck(projectPath, depcheckOptions);

        // Process unused dependencies
        const unused: UnusedDependency[] = [];

        for (const dep of result.dependencies) {
            const version = packageJson.dependencies?.[dep] || 'unknown';
            unused.push({
                name: dep,
                version,
                isDev: false,
                reason: 'No import or require statement found in the codebase',
            });
        }

        for (const dep of result.devDependencies) {
            const version = packageJson.devDependencies?.[dep] || 'unknown';
            unused.push({
                name: dep,
                version,
                isDev: true,
                reason: 'No import or require statement found in the codebase (dev dependency)',
            });
        }

        // Process missing dependencies
        const missing: MissingDependency[] = [];

        for (const [dep, usedIn] of Object.entries(result.missing)) {
            missing.push({
                name: dep,
                usedIn: usedIn.map(file => path.relative(projectPath, file)),
            });
        }

        return {
            unused,
            missing,
            totalDependencies,
            totalDevDependencies,
            success: true,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
            unused: [],
            missing: [],
            totalDependencies: 0,
            totalDevDependencies: 0,
            success: false,
            errorMessage: `Dependency analysis failed: ${errorMessage}`,
        };
    }
}

/**
 * Get a summary of unused dependencies
 */
export function getUnusedDepsSummary(result: DependencyAnalysisResult): string {
    const lines: string[] = [
        `Total Dependencies: ${result.totalDependencies}`,
        `Total Dev Dependencies: ${result.totalDevDependencies}`,
        `Unused: ${result.unused.length}`,
        `Missing: ${result.missing.length}`,
    ];

    if (result.unused.length > 0) {
        lines.push('', 'Unused Dependencies:');
        result.unused.slice(0, 5).forEach(dep => {
            const devLabel = dep.isDev ? ' (dev)' : '';
            lines.push(`  - ${dep.name}${devLabel}`);
        });
        if (result.unused.length > 5) {
            lines.push(`  ... and ${result.unused.length - 5} more`);
        }
    }

    if (result.missing.length > 0) {
        lines.push('', 'Missing Dependencies:');
        result.missing.slice(0, 5).forEach(dep => {
            lines.push(`  - ${dep.name}`);
        });
        if (result.missing.length > 5) {
            lines.push(`  ... and ${result.missing.length - 5} more`);
        }
    }

    if (!result.success) {
        lines.push('', `Error: ${result.errorMessage}`);
    }

    return lines.join('\n');
}
