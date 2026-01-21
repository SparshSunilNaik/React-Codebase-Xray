/**
 * Dependency Graph Analyzer
 * Uses madge to analyze module dependencies and detect circular imports
 */

import madge from 'madge';
import path from 'path';
import { promises as fs } from 'fs';
import type {
    DependencyGraphResult,
    DependencyNode,
    DependencyEdge,
    CircularDependency,
} from '@react-codebase-xray/shared';
import {
    normalizePath,
    detectModuleType,
    pathExists,
} from '@react-codebase-xray/shared';

export interface DependencyGraphOptions {
    /** Project root directory */
    projectPath: string;
    /** File extensions to include */
    extensions: string[];
    /** Whether to include node_modules */
    includeNodeModules?: boolean;
    /** TypeScript config path (optional) */
    tsConfigPath?: string;
}

/**
 * Analyze the dependency graph of a project
 */
export async function analyzeDependencyGraph(
    options: DependencyGraphOptions
): Promise<DependencyGraphResult> {
    const { projectPath, extensions, includeNodeModules = false } = options;

    // Determine tsconfig path
    let tsConfigPath = options.tsConfigPath;
    if (!tsConfigPath) {
        const possibleTsConfigs = ['tsconfig.json', 'tsconfig.app.json', 'jsconfig.json'];
        for (const config of possibleTsConfigs) {
            const configPath = path.join(projectPath, config);
            if (await pathExists(configPath)) {
                tsConfigPath = configPath;
                break;
            }
        }
    }

    // Find entry points - look for common entry files
    const entryPoints = await findEntryPoints(projectPath);

    // Run madge analysis
    const madgeResult = await madge(projectPath, {
        fileExtensions: extensions.map(ext => ext.replace('.', '')),
        includeNpm: includeNodeModules,
        tsConfig: tsConfigPath,
        detectiveOptions: {
            es6: {
                mixedImports: true,
            },
            ts: {
                mixedImports: true,
            },
        },
    });

    // Get the dependency object
    const dependencyObj = madgeResult.obj();

    // Get circular dependencies
    const circular = madgeResult.circular();

    // Build flat set of circular files for quick lookup
    const circularFiles = new Set<string>();
    circular.forEach(chain => chain.forEach(file => circularFiles.add(file)));

    // Build nodes and edges
    const nodesMap = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];
    const dependentCounts = new Map<string, number>();

    // First pass: count dependents for each file
    for (const [_sourceFile, dependencies] of Object.entries(dependencyObj)) {
        for (const dep of dependencies) {
            dependentCounts.set(dep, (dependentCounts.get(dep) || 0) + 1);
        }
    }

    // Second pass: build nodes and edges
    for (const [sourceFile, dependencies] of Object.entries(dependencyObj)) {
        const fullPath = path.join(projectPath, sourceFile);

        // Get file content for type detection
        let content = '';
        let linesOfCode = 0;
        try {
            content = await fs.readFile(fullPath, 'utf-8');
            linesOfCode = content.split('\n').length;
        } catch {
            // File might not exist or be unreadable
        }

        const normalizedSource = normalizePath(sourceFile);

        // Create node if not exists
        if (!nodesMap.has(normalizedSource)) {
            nodesMap.set(normalizedSource, {
                id: normalizedSource,
                label: path.basename(sourceFile),
                filePath: fullPath,
                type: detectModuleType(sourceFile, content),
                dependencyCount: dependencies.length,
                dependentCount: dependentCounts.get(sourceFile) || 0,
                isCircular: circularFiles.has(sourceFile),
                isOrphaned: (dependentCounts.get(sourceFile) || 0) === 0 && !isEntryPoint(sourceFile, entryPoints),
                linesOfCode,
            });
        }

        // Create edges
        for (const dep of dependencies) {
            const normalizedDep = normalizePath(dep);

            // Ensure target node exists
            if (!nodesMap.has(normalizedDep)) {
                const depFullPath = path.join(projectPath, dep);
                let depContent = '';
                let depLines = 0;
                try {
                    depContent = await fs.readFile(depFullPath, 'utf-8');
                    depLines = depContent.split('\n').length;
                } catch {
                    // File might not exist
                }

                nodesMap.set(normalizedDep, {
                    id: normalizedDep,
                    label: path.basename(dep),
                    filePath: depFullPath,
                    type: detectModuleType(dep, depContent),
                    dependencyCount: (dependencyObj[dep] || []).length,
                    dependentCount: dependentCounts.get(dep) || 0,
                    isCircular: circularFiles.has(dep),
                    isOrphaned: (dependentCounts.get(dep) || 0) === 0 && !isEntryPoint(dep, entryPoints),
                    linesOfCode: depLines,
                });
            }

            // Check if this edge is part of a circular dependency
            const isCircularEdge = circular.some(chain => {
                const sourceIndex = chain.indexOf(sourceFile);
                const depIndex = chain.indexOf(dep);
                return sourceIndex !== -1 && depIndex !== -1;
            });

            edges.push({
                source: normalizedSource,
                target: normalizedDep,
                isCircular: isCircularEdge,
                importType: 'static', // madge doesn't distinguish, default to static
            });
        }
    }

    const nodes = Array.from(nodesMap.values());

    // Build circular dependency chains
    const circularDependencies: CircularDependency[] = circular.map(chain => ({
        chain: chain.map(normalizePath),
        isDirect: chain.length === 2,
    }));

    // Find orphaned modules
    const orphanedModules = nodes
        .filter(node => node.isOrphaned)
        .map(node => node.id);

    // Calculate stats
    const totalModules = nodes.length;
    const averageDependencies = totalModules > 0
        ? nodes.reduce((sum, node) => sum + node.dependencyCount, 0) / totalModules
        : 0;

    return {
        nodes,
        edges,
        circularDependencies,
        orphanedModules,
        totalModules,
        averageDependencies: Math.round(averageDependencies * 100) / 100,
    };
}

/**
 * Find common entry point files in a project
 */
async function findEntryPoints(projectPath: string): Promise<string[]> {
    const commonEntries = [
        'src/index.tsx',
        'src/index.ts',
        'src/index.jsx',
        'src/index.js',
        'src/main.tsx',
        'src/main.ts',
        'src/main.jsx',
        'src/main.js',
        'src/App.tsx',
        'src/App.ts',
        'src/App.jsx',
        'src/App.js',
        'pages/_app.tsx',
        'pages/_app.js',
        'app/layout.tsx',
        'app/layout.js',
        'app/page.tsx',
        'app/page.js',
        'index.tsx',
        'index.ts',
        'index.jsx',
        'index.js',
    ];

    const entries: string[] = [];

    for (const entry of commonEntries) {
        const fullPath = path.join(projectPath, entry);
        if (await pathExists(fullPath)) {
            entries.push(entry);
        }
    }

    return entries;
}

/**
 * Check if a file is an entry point
 */
function isEntryPoint(filePath: string, entryPoints: string[]): boolean {
    const normalized = normalizePath(filePath);
    return entryPoints.some(entry => normalized.endsWith(normalizePath(entry)));
}

/**
 * Get a summary of the dependency graph for display
 */
export function getDependencyGraphSummary(result: DependencyGraphResult): string {
    const lines: string[] = [
        `Total Modules: ${result.totalModules}`,
        `Average Dependencies: ${result.averageDependencies}`,
        `Circular Dependencies: ${result.circularDependencies.length}`,
        `Orphaned Modules: ${result.orphanedModules.length}`,
    ];

    if (result.circularDependencies.length > 0) {
        lines.push('', 'Circular Dependencies:');
        result.circularDependencies.slice(0, 5).forEach(cd => {
            lines.push(`  ${cd.chain.join(' → ')}`);
        });
        if (result.circularDependencies.length > 5) {
            lines.push(`  ... and ${result.circularDependencies.length - 5} more`);
        }
    }

    return lines.join('\n');
}
