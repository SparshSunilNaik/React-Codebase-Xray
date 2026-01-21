/**
 * Main Analyzer
 * Orchestrates all analysis modules and produces a complete report
 */

import path from 'path';
import AdmZip from 'adm-zip';
import type {
    AnalysisConfig,
    AnalysisResult,
} from '@react-codebase-xray/shared';
import {
    pathExists,
    isDirectory,
    createTempDir,
    removeDir,
    normalizePath,
} from '@react-codebase-xray/shared';

import { analyzeDependencyGraph } from './dependencyGraph.js';
import { detectRoutes } from './routeDetector.js';
import { analyzeLint } from './lintAnalyzer.js';
import { analyzeUnusedDeps } from './unusedDeps.js';
import { runDiagnostics } from './diagnostics.js';
import { analyzeProjectOverview } from './projectOverview.js';

export interface AnalyzeOptions {
    /** Path to project directory or ZIP file */
    path: string;
    /** Whether the path is a ZIP file */
    isZip?: boolean;
    /** Configuration overrides */
    config?: Partial<Omit<AnalysisConfig, 'projectPath'>>;
}

/**
 * Analyze a React codebase
 */
export async function analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    let tempDir: string | null = null;

    try {
        // Determine project path
        let projectPath = options.path;

        // If it's a ZIP file, extract it first
        if (options.isZip || options.path.toLowerCase().endsWith('.zip')) {
            if (!await pathExists(options.path)) {
                throw new Error(`ZIP file not found: ${options.path}`);
            }

            tempDir = await createTempDir('react-xray');
            const zip = new AdmZip(options.path);
            zip.extractAllTo(tempDir, true);

            // Find the actual project directory (might be nested)
            projectPath = await findProjectRoot(tempDir);
            warnings.push(`Extracted ZIP to temporary directory`);
        }

        // Validate project path
        if (!await pathExists(projectPath)) {
            throw new Error(`Project path not found: ${projectPath}`);
        }

        if (!await isDirectory(projectPath)) {
            throw new Error(`Path is not a directory: ${projectPath}`);
        }

        // Build configuration
        const defaultConfig: Omit<AnalysisConfig, 'projectPath'> = {
            runDiagnostics: false,
            diagnosticTimeout: 300000,
            includeNodeModules: false,
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        };

        const config: AnalysisConfig = {
            ...defaultConfig,
            ...options.config,
            projectPath: normalizePath(projectPath),
        };

        // Run all analysis modules
        console.log('Analyzing project overview...');
        const overview = await analyzeProjectOverview({ projectPath });

        console.log('Analyzing dependency graph...');
        const dependencyGraph = await analyzeDependencyGraph({
            projectPath,
            extensions: config.extensions,
            includeNodeModules: config.includeNodeModules,
        });

        console.log('Detecting routes...');
        const routes = await detectRoutes({ projectPath });
        if (routes.warnings.length > 0) {
            warnings.push(...routes.warnings);
        }

        console.log('Running lint analysis...');
        const lint = await analyzeLint({ projectPath, extensions: config.extensions });
        if (!lint.success && lint.errorMessage) {
            warnings.push(`Lint analysis: ${lint.errorMessage}`);
        }

        console.log('Analyzing dependencies...');
        const dependencies = await analyzeUnusedDeps({ projectPath });
        if (!dependencies.success && dependencies.errorMessage) {
            warnings.push(`Dependency analysis: ${dependencies.errorMessage}`);
        }

        // Run diagnostics if enabled
        let diagnostics;
        if (config.runDiagnostics) {
            console.log('Running diagnostics (this may take a while)...');
            diagnostics = await runDiagnostics({
                projectPath,
                commands: ['install', 'build', 'test'],
                timeout: config.diagnosticTimeout,
            });
        }

        const duration = Date.now() - startTime;

        const result: AnalysisResult = {
            config,
            overview,
            dependencyGraph,
            routes,
            lint,
            dependencies,
            diagnostics,
            success: true,
            duration,
            warnings,
        };

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
            config: {
                projectPath: options.path,
                runDiagnostics: false,
                diagnosticTimeout: 300000,
                includeNodeModules: false,
                extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
            },
            overview: {
                name: 'Unknown',
                path: options.path,
                packageJson: {
                    name: 'Unknown',
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
                },
                framework: { name: 'custom', detected: false },
                fileStats: {
                    totalFiles: 0,
                    totalDirectories: 0,
                    byExtension: {},
                    totalLinesOfCode: 0,
                    largestFiles: [],
                },
                analyzedAt: new Date().toISOString(),
            },
            dependencyGraph: {
                nodes: [],
                edges: [],
                circularDependencies: [],
                orphanedModules: [],
                totalModules: 0,
                averageDependencies: 0,
            },
            routes: {
                routerType: 'unknown',
                routes: [],
                totalRoutes: 0,
                apiRoutes: 0,
                dynamicRoutes: 0,
                success: false,
                warnings: [],
            },
            lint: {
                issues: [],
                bySeverity: { error: 0, warning: 0, info: 0 },
                byCategory: {
                    'react-hooks': 0,
                    'performance': 0,
                    'accessibility': 0,
                    'best-practices': 0,
                    'security': 0,
                    'typescript': 0,
                    'imports': 0,
                    'unused-code': 0,
                    'other': 0,
                },
                filesAnalyzed: 0,
                filesWithIssues: 0,
                success: false,
            },
            dependencies: {
                unused: [],
                missing: [],
                totalDependencies: 0,
                totalDevDependencies: 0,
                success: false,
            },
            success: false,
            duration: Date.now() - startTime,
            errorMessage,
            warnings,
        };
    } finally {
        // Clean up temp directory
        if (tempDir) {
            await removeDir(tempDir);
        }
    }
}

/**
 * Find the project root directory (with package.json) inside an extracted ZIP
 */
async function findProjectRoot(dir: string): Promise<string> {
    // Check if package.json exists in the root
    if (await pathExists(path.join(dir, 'package.json'))) {
        return dir;
    }

    // Otherwise, look for it in subdirectories (common when zipping a folder)
    const { promises: fs } = await import('fs');
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const subDir = path.join(dir, entry.name);
            if (await pathExists(path.join(subDir, 'package.json'))) {
                return subDir;
            }
        }
    }

    // If no package.json found, return the root anyway
    return dir;
}

// Re-export individual analyzers for direct use
export { analyzeDependencyGraph } from './dependencyGraph.js';
export { detectRoutes } from './routeDetector.js';
export { analyzeLint } from './lintAnalyzer.js';
export { analyzeUnusedDeps } from './unusedDeps.js';
export { runDiagnostics } from './diagnostics.js';
export { analyzeProjectOverview } from './projectOverview.js';
export { generateJsonReport, generateMarkdownReport } from './reportBuilder.js';
