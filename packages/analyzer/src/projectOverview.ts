/**
 * Project Overview Analyzer
 * Gathers project metadata, package.json info, and file statistics
 */

import path from 'path';
import { promises as fs } from 'fs';
import type {
    ProjectOverview,
    PackageJsonInfo,
    ProjectFramework,
    FileStats,
} from '@react-codebase-xray/shared';
import {
    pathExists,
    readJsonFile,
    getAllFiles,
    countLines,
    normalizePath,
} from '@react-codebase-xray/shared';

export interface ProjectOverviewOptions {
    projectPath: string;
}

/**
 * Analyze project overview
 */
export async function analyzeProjectOverview(options: ProjectOverviewOptions): Promise<ProjectOverview> {
    const { projectPath } = options;

    // Read package.json
    const packageJson = await readPackageJson(projectPath);

    // Detect framework
    const framework = await detectFramework(projectPath, packageJson);

    // Get file statistics
    const fileStats = await getFileStats(projectPath);

    return {
        name: packageJson.name || path.basename(projectPath),
        path: normalizePath(projectPath),
        packageJson,
        framework,
        fileStats,
        analyzedAt: new Date().toISOString(),
    };
}

/**
 * Read and parse package.json
 */
async function readPackageJson(projectPath: string): Promise<PackageJsonInfo> {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!await pathExists(packageJsonPath)) {
        return {
            name: path.basename(projectPath),
            version: '0.0.0',
            scripts: {},
            dependencies: {},
            devDependencies: {},
            hasTypeScript: false,
            hasTailwind: false,
            hasEslint: false,
            hasPrettier: false,
            hasJest: false,
            hasVitest: false,
        };
    }

    try {
        const pkg = await readJsonFile<{
            name?: string;
            version?: string;
            description?: string;
            scripts?: Record<string, string>;
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
        }>(packageJsonPath);

        const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
        };

        return {
            name: pkg.name || path.basename(projectPath),
            version: pkg.version || '0.0.0',
            description: pkg.description,
            scripts: pkg.scripts || {},
            dependencies: pkg.dependencies || {},
            devDependencies: pkg.devDependencies || {},
            peerDependencies: pkg.peerDependencies,
            hasTypeScript: 'typescript' in allDeps || await pathExists(path.join(projectPath, 'tsconfig.json')),
            hasTailwind: 'tailwindcss' in allDeps || await pathExists(path.join(projectPath, 'tailwind.config.js')) || await pathExists(path.join(projectPath, 'tailwind.config.ts')),
            hasEslint: 'eslint' in allDeps || await pathExists(path.join(projectPath, '.eslintrc.js')) || await pathExists(path.join(projectPath, '.eslintrc.json')),
            hasPrettier: 'prettier' in allDeps || await pathExists(path.join(projectPath, '.prettierrc')) || await pathExists(path.join(projectPath, '.prettierrc.json')),
            hasJest: 'jest' in allDeps || '@jest/core' in allDeps,
            hasVitest: 'vitest' in allDeps,
        };
    } catch {
        return {
            name: path.basename(projectPath),
            version: '0.0.0',
            scripts: {},
            dependencies: {},
            devDependencies: {},
            hasTypeScript: false,
            hasTailwind: false,
            hasEslint: false,
            hasPrettier: false,
            hasJest: false,
            hasVitest: false,
        };
    }
}

/**
 * Detect which framework the project uses
 */
async function detectFramework(
    _projectPath: string,
    packageJson: PackageJsonInfo
): Promise<ProjectFramework> {
    const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
    };

    // Check for Next.js
    if ('next' in allDeps) {
        return {
            name: 'next',
            version: allDeps['next']?.replace(/[\^~]/g, ''),
            detected: true,
        };
    }

    // Check for Vite
    if ('vite' in allDeps) {
        return {
            name: 'vite',
            version: allDeps['vite']?.replace(/[\^~]/g, ''),
            detected: true,
        };
    }

    // Check for Create React App
    if ('react-scripts' in allDeps) {
        return {
            name: 'create-react-app',
            version: allDeps['react-scripts']?.replace(/[\^~]/g, ''),
            detected: true,
        };
    }

    // Check for Remix
    if ('@remix-run/react' in allDeps) {
        return {
            name: 'remix',
            version: allDeps['@remix-run/react']?.replace(/[\^~]/g, ''),
            detected: true,
        };
    }

    // Check for Gatsby
    if ('gatsby' in allDeps) {
        return {
            name: 'gatsby',
            version: allDeps['gatsby']?.replace(/[\^~]/g, ''),
            detected: true,
        };
    }

    // Custom/unknown
    return {
        name: 'custom',
        detected: false,
    };
}

/**
 * Get file statistics for the project
 */
async function getFileStats(projectPath: string): Promise<FileStats> {
    const files = await getAllFiles(projectPath);

    // Count extensions
    const byExtension: Record<string, number> = {};
    for (const file of files) {
        const ext = path.extname(file).toLowerCase() || '(no ext)';
        byExtension[ext] = (byExtension[ext] || 0) + 1;
    }

    // Count directories
    let totalDirectories = 0;
    async function countDirs(dir: string): Promise<void> {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
                    totalDirectories++;
                    await countDirs(path.join(dir, entry.name));
                }
            }
        } catch {
            // Ignore errors
        }
    }
    await countDirs(projectPath);

    // Count lines of code for source files
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    const sourceFiles = files.filter(f => sourceExtensions.includes(path.extname(f).toLowerCase()));

    let totalLinesOfCode = 0;
    const fileLinesMap: { path: string; lines: number }[] = [];

    // Process files in batches to avoid overwhelming the system
    const batchSize = 100;
    for (let i = 0; i < sourceFiles.length; i += batchSize) {
        const batch = sourceFiles.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(async (file) => {
                const lines = await countLines(file);
                return { path: normalizePath(path.relative(projectPath, file)), lines };
            })
        );

        for (const result of results) {
            totalLinesOfCode += result.lines;
            fileLinesMap.push(result);
        }
    }

    // Get largest files
    const largestFiles = fileLinesMap
        .sort((a, b) => b.lines - a.lines)
        .slice(0, 10);

    return {
        totalFiles: files.length,
        totalDirectories,
        byExtension,
        totalLinesOfCode,
        largestFiles,
    };
}

/**
 * Get project overview summary
 */
export function getProjectOverviewSummary(overview: ProjectOverview): string {
    const lines: string[] = [
        `Project: ${overview.name}`,
        `Framework: ${overview.framework.name}${overview.framework.version ? ` v${overview.framework.version}` : ''}`,
        `Files: ${overview.fileStats.totalFiles}`,
        `Directories: ${overview.fileStats.totalDirectories}`,
        `Lines of Code: ${overview.fileStats.totalLinesOfCode.toLocaleString()}`,
        `TypeScript: ${overview.packageJson.hasTypeScript ? 'Yes' : 'No'}`,
        `Tailwind: ${overview.packageJson.hasTailwind ? 'Yes' : 'No'}`,
    ];

    return lines.join('\n');
}
