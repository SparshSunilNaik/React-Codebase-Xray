/**
 * Shared utility functions for react-codebase-xray
 * Cross-platform path handling and common operations
 */

import { promises as fs } from 'fs';
import path from 'path';

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Normalize a path to use forward slashes (cross-platform)
 */
export function normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

/**
 * Get relative path from base to target, normalized
 */
export function getRelativePath(basePath: string, targetPath: string): string {
    return normalizePath(path.relative(basePath, targetPath));
}

/**
 * Join paths and normalize
 */
export function joinPath(...paths: string[]): string {
    return normalizePath(path.join(...paths));
}

/**
 * Get the file extension without the dot
 */
export function getExtension(filePath: string): string {
    const ext = path.extname(filePath);
    return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Get the filename without extension
 */
export function getBasename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
}

/**
 * Check if a path is within another path (security check)
 */
export function isPathWithin(childPath: string, parentPath: string): boolean {
    const relative = path.relative(parentPath, childPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
}

// =============================================================================
// File System Utilities
// =============================================================================

/**
 * Check if a path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
    try {
        const stats = await fs.stat(filePath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Check if a path is a file
 */
export async function isFile(filePath: string): Promise<boolean> {
    try {
        const stats = await fs.stat(filePath);
        return stats.isFile();
    } catch {
        return false;
    }
}

/**
 * Read a file as string
 */
export async function readFileContent(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
}

/**
 * Read and parse a JSON file
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
    const content = await readFileContent(filePath);
    return JSON.parse(content) as T;
}

/**
 * Get all files in a directory recursively
 */
export async function getAllFiles(
    dirPath: string,
    extensions?: string[],
    ignore: string[] = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage']
): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentPath: string): Promise<void> {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                if (!ignore.includes(entry.name)) {
                    await walk(fullPath);
                }
            } else if (entry.isFile()) {
                if (!extensions || extensions.includes(path.extname(entry.name))) {
                    files.push(fullPath);
                }
            }
        }
    }

    await walk(dirPath);
    return files;
}

/**
 * Count lines in a file
 */
export async function countLines(filePath: string): Promise<number> {
    try {
        const content = await readFileContent(filePath);
        return content.split('\n').length;
    } catch {
        return 0;
    }
}

/**
 * Create a temporary directory
 */
export async function createTempDir(prefix: string): Promise<string> {
    const os = await import('os');
    const tempBase = os.tmpdir();
    const tempDir = path.join(tempBase, `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
}

/**
 * Remove a directory recursively
 */
export async function removeDir(dirPath: string): Promise<void> {
    try {
        await fs.rm(dirPath, { recursive: true, force: true });
    } catch {
        // Ignore errors
    }
}

// =============================================================================
// Module Type Detection
// =============================================================================

/**
 * Detect the type of a React module based on its content and path
 */
export function detectModuleType(
    filePath: string,
    content: string
): 'component' | 'hook' | 'util' | 'page' | 'layout' | 'api' | 'config' | 'test' | 'unknown' {
    const normalizedPath = normalizePath(filePath).toLowerCase();
    const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();

    // Test files
    if (normalizedPath.includes('.test.') || normalizedPath.includes('.spec.') || normalizedPath.includes('__tests__')) {
        return 'test';
    }

    // Config files
    if (fileName.includes('config') || fileName.includes('.config') || fileName === 'tailwind' || fileName === 'vite' || fileName === 'next') {
        return 'config';
    }

    // API routes
    if (normalizedPath.includes('/api/') || normalizedPath.includes('/routes/')) {
        return 'api';
    }

    // Next.js special files
    if (fileName === 'layout' || fileName === '_layout') {
        return 'layout';
    }

    if (fileName === 'page' || fileName === '_app' || fileName === '_document' || normalizedPath.includes('/pages/')) {
        return 'page';
    }

    // Hooks (check content for use* pattern and check filename)
    if (fileName.startsWith('use') || /^export\s+(default\s+)?function\s+use[A-Z]/m.test(content)) {
        return 'hook';
    }

    // Components (check for JSX return or React.FC)
    if (
        /return\s*\(\s*</.test(content) ||
        /return\s+</.test(content) ||
        /:\s*(React\.)?FC/.test(content) ||
        /React\.createElement/.test(content)
    ) {
        return 'component';
    }

    // Utils
    if (normalizedPath.includes('/utils/') || normalizedPath.includes('/helpers/') || normalizedPath.includes('/lib/')) {
        return 'util';
    }

    return 'unknown';
}

// =============================================================================
// Error Parsing Utilities
// =============================================================================

/**
 * Common patterns for parsing npm/build errors
 */
export const ERROR_PATTERNS = {
    moduleNotFound: /Cannot find module ['"]([^'"]+)['"]/,
    typeError: /Type ['"]([^'"]+)['"] is not assignable/,
    syntaxError: /SyntaxError: (.+)/,
    eslintError: /error\s+(.+?)\s+(.+)/,
    webpackError: /Module build failed/,
    missingDependency: /Cannot resolve ['"]([^'"]+)['"]/,
    nodeVersion: /Node\.js v(\d+\.\d+\.\d+)/,
    npmError: /npm ERR! (.+)/,
};

/**
 * Extract file paths from an error message
 */
export function extractFilePaths(errorMessage: string): string[] {
    const pathPattern = /(?:at\s+)?(?:[A-Za-z]:)?[\\/]?(?:[\w.-]+[\\/])+[\w.-]+\.\w+/g;
    const matches = errorMessage.match(pathPattern) || [];
    return [...new Set(matches.map(normalizePath))];
}

/**
 * Get a human-readable error type
 */
export function categorizeError(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('cannot find module') || lowerMessage.includes('module not found')) {
        return 'module-not-found';
    }
    if (lowerMessage.includes('type') && lowerMessage.includes('not assignable')) {
        return 'type-error';
    }
    if (lowerMessage.includes('syntax')) {
        return 'syntax-error';
    }
    if (lowerMessage.includes('out of memory') || lowerMessage.includes('heap')) {
        return 'memory-error';
    }
    if (lowerMessage.includes('permission') || lowerMessage.includes('eacces')) {
        return 'permission-error';
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('enotfound')) {
        return 'network-error';
    }

    return 'unknown-error';
}

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Format a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Format a file size in bytes to a human-readable string
 */
export function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
