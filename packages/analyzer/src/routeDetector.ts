/**
 * Route Detector
 * Detects routes from Next.js (App Router & Pages Router) and React Router patterns
 */

import path from 'path';
import { glob } from 'glob';
import type {
    RouteInfo,
    RouteDetectionResult,
    RouterType,
    RouteType,
} from '@react-codebase-xray/shared';
import {
    normalizePath,
    pathExists,
    readFileContent,
} from '@react-codebase-xray/shared';

export interface RouteDetectorOptions {
    projectPath: string;
}

/**
 * Detect routes in a React project
 */
export async function detectRoutes(options: RouteDetectorOptions): Promise<RouteDetectionResult> {
    const { projectPath } = options;
    const warnings: string[] = [];

    // Try to detect the router type
    const routerType = await detectRouterType(projectPath);

    let routes: RouteInfo[] = [];

    switch (routerType) {
        case 'nextjs-app':
            routes = await detectNextAppRoutes(projectPath);
            break;
        case 'nextjs-pages':
            routes = await detectNextPagesRoutes(projectPath);
            break;
        case 'react-router':
            routes = await detectReactRouterRoutes(projectPath);
            break;
        default:
            warnings.push('Could not detect routing library. Tried best-effort detection.');
            // Try all methods and combine results
            const appRoutes = await detectNextAppRoutes(projectPath);
            const pagesRoutes = await detectNextPagesRoutes(projectPath);
            const reactRouterRoutes = await detectReactRouterRoutes(projectPath);
            routes = [...appRoutes, ...pagesRoutes, ...reactRouterRoutes];
    }

    // Calculate statistics
    const totalRoutes = countAllRoutes(routes);
    const apiRoutes = countApiRoutes(routes);
    const dynamicRoutes = countDynamicRoutes(routes);

    return {
        routerType,
        routes,
        totalRoutes,
        apiRoutes,
        dynamicRoutes,
        success: true,
        warnings,
    };
}

/**
 * Detect which router type the project uses
 */
async function detectRouterType(projectPath: string): Promise<RouterType> {
    // Check for Next.js
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await pathExists(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(await readFileContent(packageJsonPath));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            if (deps['next']) {
                // Check for app directory (App Router)
                if (await pathExists(path.join(projectPath, 'app'))) {
                    return 'nextjs-app';
                }
                // Check for pages directory
                if (await pathExists(path.join(projectPath, 'pages'))) {
                    return 'nextjs-pages';
                }
                // Check for src/app or src/pages
                if (await pathExists(path.join(projectPath, 'src', 'app'))) {
                    return 'nextjs-app';
                }
                if (await pathExists(path.join(projectPath, 'src', 'pages'))) {
                    return 'nextjs-pages';
                }
            }

            if (deps['react-router'] || deps['react-router-dom']) {
                return 'react-router';
            }
        } catch {
            // Ignore parse errors
        }
    }

    return 'unknown';
}

/**
 * Detect Next.js App Router routes
 */
async function detectNextAppRoutes(projectPath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    // Look for app directory
    let appDir = path.join(projectPath, 'app');
    if (!await pathExists(appDir)) {
        appDir = path.join(projectPath, 'src', 'app');
        if (!await pathExists(appDir)) {
            return routes;
        }
    }

    // Find all page.tsx/js files
    const pageFiles = await glob('**/page.{tsx,ts,jsx,js}', {
        cwd: appDir,
        nodir: true,
    });

    for (const pageFile of pageFiles) {
        const dirPath = path.dirname(pageFile);
        const routePath = convertNextAppPathToRoute(dirPath);
        const fullFilePath = path.join(appDir, pageFile);

        routes.push(createRouteInfo(routePath, fullFilePath, false));
    }

    // Find all route.tsx/js files (API routes)
    const apiFiles = await glob('**/route.{tsx,ts,jsx,js}', {
        cwd: appDir,
        nodir: true,
    });

    for (const apiFile of apiFiles) {
        const dirPath = path.dirname(apiFile);
        const routePath = convertNextAppPathToRoute(dirPath);
        const fullFilePath = path.join(appDir, apiFile);

        const methods = await detectApiMethods(fullFilePath);
        routes.push(createRouteInfo(routePath, fullFilePath, true, methods));
    }

    return routes;
}

/**
 * Convert Next.js App Router file path to route
 */
function convertNextAppPathToRoute(filePath: string): string {
    if (filePath === '.') return '/';

    let route = '/' + filePath
        .split(path.sep)
        .filter(segment => {
            // Filter out route groups (parentheses)
            if (segment.startsWith('(') && segment.endsWith(')')) return false;
            // Filter out parallel routes (@)
            if (segment.startsWith('@')) return false;
            // Filter out intercepting routes (...)
            if (segment.includes('(...)') || segment.includes('(..)') || segment.includes('(.)')) return false;
            return true;
        })
        .map(segment => {
            // Convert [param] to :param
            if (segment.startsWith('[') && segment.endsWith(']')) {
                const param = segment.slice(1, -1);
                // [...slug] -> catch-all
                if (param.startsWith('...')) {
                    return `:${param.slice(3)}*`;
                }
                // [[...slug]] -> optional catch-all (already handled by outer check)
                return `:${param}`;
            }
            return segment;
        })
        .join('/');

    return route || '/';
}

/**
 * Detect Next.js Pages Router routes
 */
async function detectNextPagesRoutes(projectPath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    // Look for pages directory
    let pagesDir = path.join(projectPath, 'pages');
    if (!await pathExists(pagesDir)) {
        pagesDir = path.join(projectPath, 'src', 'pages');
        if (!await pathExists(pagesDir)) {
            return routes;
        }
    }

    // Find all page files
    const pageFiles = await glob('**/*.{tsx,ts,jsx,js}', {
        cwd: pagesDir,
        nodir: true,
        ignore: ['_app.*', '_document.*', '_error.*', 'api/**'],
    });

    for (const pageFile of pageFiles) {
        const routePath = convertNextPagesPathToRoute(pageFile);
        const fullFilePath = path.join(pagesDir, pageFile);

        routes.push(createRouteInfo(routePath, fullFilePath, false));
    }

    // Find API routes
    const apiDir = path.join(pagesDir, 'api');
    if (await pathExists(apiDir)) {
        const apiFiles = await glob('**/*.{tsx,ts,jsx,js}', {
            cwd: apiDir,
            nodir: true,
        });

        for (const apiFile of apiFiles) {
            const routePath = '/api' + convertNextPagesPathToRoute(apiFile);
            const fullFilePath = path.join(apiDir, apiFile);

            routes.push(createRouteInfo(routePath, fullFilePath, true));
        }
    }

    return routes;
}

/**
 * Convert Next.js Pages Router file path to route
 */
function convertNextPagesPathToRoute(filePath: string): string {
    let route = '/' + filePath
        .replace(/\.(tsx|ts|jsx|js)$/, '')
        .split(path.sep)
        .map(segment => {
            if (segment === 'index') return '';
            if (segment.startsWith('[') && segment.endsWith(']')) {
                const param = segment.slice(1, -1);
                if (param.startsWith('...')) {
                    return `:${param.slice(3)}*`;
                }
                return `:${param}`;
            }
            return segment;
        })
        .filter(Boolean)
        .join('/');

    return route || '/';
}

/**
 * Detect React Router routes by parsing source files
 */
async function detectReactRouterRoutes(projectPath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    // Find files that might contain route definitions
    const srcDir = path.join(projectPath, 'src');
    const searchDir = await pathExists(srcDir) ? srcDir : projectPath;

    const files = await glob('**/*.{tsx,ts,jsx,js}', {
        cwd: searchDir,
        nodir: true,
        ignore: ['node_modules/**', 'dist/**', 'build/**'],
    });

    for (const file of files) {
        const fullPath = path.join(searchDir, file);
        try {
            const content = await readFileContent(fullPath);

            // Look for route patterns
            const extractedRoutes = extractReactRouterRoutes(content, fullPath);
            routes.push(...extractedRoutes);
        } catch {
            // Ignore unreadable files
        }
    }

    return routes;
}

/**
 * Extract React Router routes from file content
 */
function extractReactRouterRoutes(content: string, filePath: string): RouteInfo[] {
    const routes: RouteInfo[] = [];

    // Pattern for <Route path="..." element={...} />
    const routePattern = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*>/g;
    let match;

    while ((match = routePattern.exec(content)) !== null) {
        const routePath = match[1];
        routes.push(createRouteInfo(routePath, filePath, false));
    }

    // Pattern for createBrowserRouter / createRoutesFromElements
    const routeObjectPattern = /{\s*path:\s*["']([^"']+)["']/g;

    while ((match = routeObjectPattern.exec(content)) !== null) {
        const routePath = match[1];
        // Avoid duplicates
        if (!routes.some(r => r.path === routePath)) {
            routes.push(createRouteInfo(routePath, filePath, false));
        }
    }

    return routes;
}

/**
 * Detect HTTP methods exported from an API route file
 */
async function detectApiMethods(filePath: string): Promise<('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[]> {
    const methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[] = [];

    try {
        const content = await readFileContent(filePath);

        const methodPatterns = [
            { pattern: /export\s+(async\s+)?function\s+GET/i, method: 'GET' as const },
            { pattern: /export\s+(async\s+)?function\s+POST/i, method: 'POST' as const },
            { pattern: /export\s+(async\s+)?function\s+PUT/i, method: 'PUT' as const },
            { pattern: /export\s+(async\s+)?function\s+DELETE/i, method: 'DELETE' as const },
            { pattern: /export\s+(async\s+)?function\s+PATCH/i, method: 'PATCH' as const },
            { pattern: /export\s+const\s+GET/i, method: 'GET' as const },
            { pattern: /export\s+const\s+POST/i, method: 'POST' as const },
            { pattern: /export\s+const\s+PUT/i, method: 'PUT' as const },
            { pattern: /export\s+const\s+DELETE/i, method: 'DELETE' as const },
            { pattern: /export\s+const\s+PATCH/i, method: 'PATCH' as const },
        ];

        for (const { pattern, method } of methodPatterns) {
            if (pattern.test(content)) {
                methods.push(method);
            }
        }
    } catch {
        // Default to GET if we can't read the file
    }

    return methods.length > 0 ? methods : ['GET'];
}

/**
 * Create a RouteInfo object
 */
function createRouteInfo(
    routePath: string,
    filePath: string,
    isApi: boolean,
    methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[]
): RouteInfo {
    const dynamicSegments = extractDynamicSegments(routePath);

    let type: RouteType = 'static';
    if (routePath.includes(':') && routePath.includes('*')) {
        type = 'catch-all';
    } else if (routePath.includes(':')) {
        type = 'dynamic';
    }

    return {
        path: routePath,
        filePath: normalizePath(filePath),
        type,
        methods: isApi ? methods : undefined,
        isApi,
        hasDynamicSegments: dynamicSegments.length > 0,
        dynamicSegments,
        isLayout: filePath.includes('layout.'),
        isError: filePath.includes('error.') || filePath.includes('_error.'),
        isLoading: filePath.includes('loading.'),
        children: [],
    };
}

/**
 * Extract dynamic segment names from a route path
 */
function extractDynamicSegments(routePath: string): string[] {
    const segments: string[] = [];
    const pattern = /:([^/*]+)/g;
    let match;

    while ((match = pattern.exec(routePath)) !== null) {
        segments.push(match[1].replace('*', ''));
    }

    return segments;
}

/**
 * Count total routes including nested
 */
function countAllRoutes(routes: RouteInfo[]): number {
    let count = routes.length;
    for (const route of routes) {
        count += countAllRoutes(route.children);
    }
    return count;
}

/**
 * Count API routes
 */
function countApiRoutes(routes: RouteInfo[]): number {
    let count = routes.filter(r => r.isApi).length;
    for (const route of routes) {
        count += countApiRoutes(route.children);
    }
    return count;
}

/**
 * Count dynamic routes
 */
function countDynamicRoutes(routes: RouteInfo[]): number {
    let count = routes.filter(r => r.hasDynamicSegments).length;
    for (const route of routes) {
        count += countDynamicRoutes(route.children);
    }
    return count;
}

/**
 * Get a summary of detected routes
 */
export function getRouteSummary(result: RouteDetectionResult): string {
    const lines: string[] = [
        `Router Type: ${result.routerType}`,
        `Total Routes: ${result.totalRoutes}`,
        `API Routes: ${result.apiRoutes}`,
        `Dynamic Routes: ${result.dynamicRoutes}`,
    ];

    if (result.routes.length > 0) {
        lines.push('', 'Routes:');
        result.routes.slice(0, 10).forEach(route => {
            const suffix = route.isApi ? ' [API]' : '';
            lines.push(`  ${route.path}${suffix}`);
        });
        if (result.routes.length > 10) {
            lines.push(`  ... and ${result.routes.length - 10} more`);
        }
    }

    return lines.join('\n');
}
