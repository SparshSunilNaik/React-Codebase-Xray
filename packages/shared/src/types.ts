/**
 * Core types for react-codebase-xray
 * All analysis results, configurations, and shared interfaces
 */

// =============================================================================
// Analysis Configuration
// =============================================================================

export interface AnalysisConfig {
    /** Path to the project to analyze */
    projectPath: string;
    /** Whether to run diagnostics (npm install, build, test) */
    runDiagnostics: boolean;
    /** Timeout for diagnostic commands in milliseconds */
    diagnosticTimeout: number;
    /** Whether to include node_modules in analysis */
    includeNodeModules: boolean;
    /** File extensions to analyze */
    extensions: string[];
}

export const DEFAULT_ANALYSIS_CONFIG: Omit<AnalysisConfig, 'projectPath'> = {
    runDiagnostics: false,
    diagnosticTimeout: 300000, // 5 minutes
    includeNodeModules: false,
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
};

// =============================================================================
// Dependency Graph Types
// =============================================================================

export interface DependencyNode {
    /** Unique identifier (file path relative to project root) */
    id: string;
    /** Display label (usually filename) */
    label: string;
    /** Full file path */
    filePath: string;
    /** Type of module */
    type: 'component' | 'hook' | 'util' | 'page' | 'layout' | 'api' | 'config' | 'test' | 'unknown';
    /** Number of files this module depends on */
    dependencyCount: number;
    /** Number of files that depend on this module */
    dependentCount: number;
    /** Whether this module is part of a circular dependency */
    isCircular: boolean;
    /** Whether this module has no dependents (potentially orphaned) */
    isOrphaned: boolean;
    /** Lines of code (approximate) */
    linesOfCode: number;
}

export interface DependencyEdge {
    /** Source node ID */
    source: string;
    /** Target node ID */
    target: string;
    /** Whether this edge is part of a circular dependency */
    isCircular: boolean;
    /** Type of import */
    importType: 'static' | 'dynamic' | 'require';
}

export interface CircularDependency {
    /** Chain of files forming the cycle */
    chain: string[];
    /** Whether this is a direct cycle (A -> B -> A) or indirect */
    isDirect: boolean;
}

export interface DependencyGraphResult {
    /** All nodes in the dependency graph */
    nodes: DependencyNode[];
    /** All edges in the dependency graph */
    edges: DependencyEdge[];
    /** Detected circular dependencies */
    circularDependencies: CircularDependency[];
    /** Orphaned modules (no dependents) */
    orphanedModules: string[];
    /** Total number of modules */
    totalModules: number;
    /** Average dependencies per module */
    averageDependencies: number;
}

// =============================================================================
// Route Detection Types
// =============================================================================

export type RouteType = 'static' | 'dynamic' | 'catch-all' | 'optional-catch-all' | 'group' | 'parallel';
export type RouterType = 'nextjs-app' | 'nextjs-pages' | 'react-router' | 'unknown';

export interface RouteInfo {
    /** Route path (e.g., /users/[id]) */
    path: string;
    /** Source file that defines this route */
    filePath: string;
    /** Type of route */
    type: RouteType;
    /** HTTP methods supported (for API routes) */
    methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
    /** Whether this is an API route */
    isApi: boolean;
    /** Whether this route has dynamic segments */
    hasDynamicSegments: boolean;
    /** Dynamic segment names */
    dynamicSegments: string[];
    /** Whether this is a layout */
    isLayout: boolean;
    /** Whether this is an error boundary */
    isError: boolean;
    /** Whether this is a loading state */
    isLoading: boolean;
    /** Child routes */
    children: RouteInfo[];
}

export interface RouteDetectionResult {
    /** Detected router type */
    routerType: RouterType;
    /** All detected routes */
    routes: RouteInfo[];
    /** Total number of routes */
    totalRoutes: number;
    /** Number of API routes */
    apiRoutes: number;
    /** Number of dynamic routes */
    dynamicRoutes: number;
    /** Whether route detection was successful */
    success: boolean;
    /** Warning messages */
    warnings: string[];
}

// =============================================================================
// Lint Analysis Types
// =============================================================================

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCategory =
    | 'react-hooks'
    | 'performance'
    | 'accessibility'
    | 'best-practices'
    | 'security'
    | 'typescript'
    | 'imports'
    | 'unused-code'
    | 'other';

export interface LintIssue {
    /** Unique identifier */
    id: string;
    /** ESLint rule ID */
    ruleId: string;
    /** Issue message */
    message: string;
    /** Severity level */
    severity: IssueSeverity;
    /** Category of issue */
    category: IssueCategory;
    /** File path */
    filePath: string;
    /** Line number */
    line: number;
    /** Column number */
    column: number;
    /** End line number */
    endLine?: number;
    /** End column number */
    endColumn?: number;
    /** Source code snippet */
    source?: string;
    /** Suggested fix */
    suggestedFix?: string;
    /** Human-readable explanation */
    explanation: string;
    /** Whether this issue can be auto-fixed */
    fixable: boolean;
}

export interface LintAnalysisResult {
    /** All lint issues found */
    issues: LintIssue[];
    /** Issues grouped by severity */
    bySeverity: {
        error: number;
        warning: number;
        info: number;
    };
    /** Issues grouped by category */
    byCategory: Record<IssueCategory, number>;
    /** Total files analyzed */
    filesAnalyzed: number;
    /** Files with issues */
    filesWithIssues: number;
    /** Whether lint analysis completed successfully */
    success: boolean;
    /** Error message if failed */
    errorMessage?: string;
}

// =============================================================================
// Unused Dependencies Types
// =============================================================================

export interface UnusedDependency {
    /** Package name */
    name: string;
    /** Current version in package.json */
    version: string;
    /** Whether this is a dev dependency */
    isDev: boolean;
    /** Reason for being marked as unused */
    reason: string;
}

export interface MissingDependency {
    /** Package name */
    name: string;
    /** Files that import this package */
    usedIn: string[];
}

export interface DependencyAnalysisResult {
    /** Unused dependencies */
    unused: UnusedDependency[];
    /** Missing dependencies */
    missing: MissingDependency[];
    /** Total dependencies in package.json */
    totalDependencies: number;
    /** Total dev dependencies in package.json */
    totalDevDependencies: number;
    /** Whether analysis completed successfully */
    success: boolean;
    /** Error message if failed */
    errorMessage?: string;
}

// =============================================================================
// Diagnostics Types
// =============================================================================

export type DiagnosticCommand = 'install' | 'build' | 'test';

export interface DiagnosticStep {
    /** Command that was run */
    command: DiagnosticCommand;
    /** Full command string */
    fullCommand: string;
    /** Exit code */
    exitCode: number | null;
    /** Whether the command succeeded */
    success: boolean;
    /** Standard output */
    stdout: string;
    /** Standard error */
    stderr: string;
    /** Duration in milliseconds */
    duration: number;
    /** Whether the command timed out */
    timedOut: boolean;
}

export interface DiagnosticError {
    /** Error type (e.g., "module-not-found", "type-error") */
    type: string;
    /** Error message */
    message: string;
    /** Files involved */
    files: string[];
    /** Probable cause */
    probableCause: string;
    /** Suggested fix */
    suggestedFix: string;
    /** Confidence level (0-1) */
    confidence: number;
}

export interface DiagnosticResult {
    /** All diagnostic steps run */
    steps: DiagnosticStep[];
    /** Parsed errors with explanations */
    errors: DiagnosticError[];
    /** Overall success */
    success: boolean;
    /** Summary message */
    summary: string;
    /** Total duration in milliseconds */
    totalDuration: number;
}

// =============================================================================
// Project Overview Types
// =============================================================================

export interface PackageJsonInfo {
    name: string;
    version: string;
    description?: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies?: Record<string, string>;
    hasTypeScript: boolean;
    hasTailwind: boolean;
    hasEslint: boolean;
    hasPrettier: boolean;
    hasJest: boolean;
    hasVitest: boolean;
}

export interface ProjectFramework {
    name: 'next' | 'vite' | 'create-react-app' | 'remix' | 'gatsby' | 'custom';
    version?: string;
    detected: boolean;
}

export interface FileStats {
    totalFiles: number;
    totalDirectories: number;
    byExtension: Record<string, number>;
    totalLinesOfCode: number;
    largestFiles: { path: string; lines: number }[];
}

export interface ProjectOverview {
    /** Project name from package.json */
    name: string;
    /** Project path */
    path: string;
    /** Package.json information */
    packageJson: PackageJsonInfo;
    /** Detected framework */
    framework: ProjectFramework;
    /** File statistics */
    fileStats: FileStats;
    /** Analysis timestamp */
    analyzedAt: string;
}

// =============================================================================
// Complete Analysis Result
// =============================================================================

export interface AnalysisResult {
    /** Analysis configuration used */
    config: AnalysisConfig;
    /** Project overview */
    overview: ProjectOverview;
    /** Dependency graph analysis */
    dependencyGraph: DependencyGraphResult;
    /** Route detection results */
    routes: RouteDetectionResult;
    /** Lint analysis results */
    lint: LintAnalysisResult;
    /** Dependency analysis results */
    dependencies: DependencyAnalysisResult;
    /** Diagnostics results (if run) */
    diagnostics?: DiagnosticResult;
    /** Overall analysis success */
    success: boolean;
    /** Analysis duration in milliseconds */
    duration: number;
    /** Error message if failed */
    errorMessage?: string;
    /** Warnings from analysis */
    warnings: string[];
}

// =============================================================================
// API Types
// =============================================================================

export interface AnalyzeRequest {
    /** Path to project or ZIP file */
    path: string;
    /** Whether path is a ZIP file */
    isZip: boolean;
    /** Analysis configuration overrides */
    config?: Partial<Omit<AnalysisConfig, 'projectPath'>>;
}

export interface AnalyzeResponse {
    success: boolean;
    result?: AnalysisResult;
    error?: string;
}

export interface DiagnosticsRequest {
    /** Path to project */
    projectPath: string;
    /** Commands to run */
    commands: DiagnosticCommand[];
    /** Timeout per command in milliseconds */
    timeout?: number;
}

export interface DiagnosticsResponse {
    success: boolean;
    result?: DiagnosticResult;
    error?: string;
}

export interface HealthResponse {
    status: 'ok' | 'error';
    version: string;
    timestamp: string;
}
