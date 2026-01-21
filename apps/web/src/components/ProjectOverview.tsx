import type { AnalysisResult } from '@react-codebase-xray/shared';

interface ProjectOverviewProps {
    result: AnalysisResult;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

export function ProjectOverview({ result }: ProjectOverviewProps) {
    const { overview, dependencyGraph, routes, lint, dependencies } = result;

    const stats = [
        {
            label: 'Total Files',
            value: overview.fileStats.totalFiles.toLocaleString(),
            icon: '📄',
            color: 'text-blue-400',
        },
        {
            label: 'Lines of Code',
            value: overview.fileStats.totalLinesOfCode.toLocaleString(),
            icon: '📝',
            color: 'text-green-400',
        },
        {
            label: 'Modules',
            value: dependencyGraph.totalModules.toLocaleString(),
            icon: '📦',
            color: 'text-purple-400',
        },
        {
            label: 'Routes',
            value: routes.totalRoutes.toLocaleString(),
            icon: '🛣️',
            color: 'text-yellow-400',
        },
    ];

    const issues = [
        {
            label: 'Circular Dependencies',
            value: dependencyGraph.circularDependencies.length,
            severity: dependencyGraph.circularDependencies.length > 0 ? 'warning' : 'success',
        },
        {
            label: 'Lint Errors',
            value: lint.bySeverity.error,
            severity: lint.bySeverity.error > 0 ? 'error' : 'success',
        },
        {
            label: 'Lint Warnings',
            value: lint.bySeverity.warning,
            severity: lint.bySeverity.warning > 5 ? 'warning' : 'success',
        },
        {
            label: 'Unused Dependencies',
            value: dependencies.unused.length,
            severity: dependencies.unused.length > 0 ? 'info' : 'success',
        },
        {
            label: 'Missing Dependencies',
            value: dependencies.missing.length,
            severity: dependencies.missing.length > 0 ? 'error' : 'success',
        },
        {
            label: 'Orphaned Modules',
            value: dependencyGraph.orphanedModules.length,
            severity: dependencyGraph.orphanedModules.length > 5 ? 'info' : 'success',
        },
    ];

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'success': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-surface-700 text-surface-300 border-surface-600';
        }
    };

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{overview.name}</h2>
                    <p className="text-surface-400 mt-1">{overview.path}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 rounded-lg bg-surface-800 border border-surface-700">
                        <span className="text-surface-400 text-sm">Framework</span>
                        <p className="font-semibold capitalize">
                            {overview.framework.name}
                            {overview.framework.version && (
                                <span className="text-surface-400 font-normal ml-1">v{overview.framework.version}</span>
                            )}
                        </p>
                    </div>
                    <div className="px-4 py-2 rounded-lg bg-surface-800 border border-surface-700">
                        <span className="text-surface-400 text-sm">Analysis Time</span>
                        <p className="font-semibold">{formatDuration(result.duration)}</p>
                    </div>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-surface-800/50 rounded-xl p-6 border border-surface-700/50"
                    >
                        <span className="text-3xl mb-2 block">{stat.icon}</span>
                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-surface-400 text-sm mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Tech stack */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                    {overview.packageJson.hasTypeScript && (
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm border border-blue-500/30">
                            TypeScript
                        </span>
                    )}
                    {overview.packageJson.hasTailwind && (
                        <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm border border-cyan-500/30">
                            Tailwind CSS
                        </span>
                    )}
                    {overview.packageJson.hasEslint && (
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm border border-purple-500/30">
                            ESLint
                        </span>
                    )}
                    {overview.packageJson.hasPrettier && (
                        <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-sm border border-pink-500/30">
                            Prettier
                        </span>
                    )}
                    {overview.packageJson.hasJest && (
                        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm border border-red-500/30">
                            Jest
                        </span>
                    )}
                    {overview.packageJson.hasVitest && (
                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm border border-green-500/30">
                            Vitest
                        </span>
                    )}
                    {routes.routerType !== 'unknown' && (
                        <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm border border-orange-500/30">
                            {routes.routerType}
                        </span>
                    )}
                </div>
            </div>

            {/* Issues summary */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Health Check</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {issues.map((issue) => (
                        <div
                            key={issue.label}
                            className={`px-4 py-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
                        >
                            <p className="text-2xl font-bold">{issue.value}</p>
                            <p className="text-sm opacity-80">{issue.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* File types breakdown */}
            <div>
                <h3 className="text-lg font-semibold mb-4">File Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(overview.fileStats.byExtension)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 12)
                        .map(([ext, count]) => (
                            <div
                                key={ext}
                                className="px-4 py-3 rounded-lg bg-surface-800/50 border border-surface-700/50"
                            >
                                <p className="font-mono text-primary-400">{ext || '(none)'}</p>
                                <p className="text-surface-400 text-sm">{count} files</p>
                            </div>
                        ))}
                </div>
            </div>

            {/* Largest files */}
            {overview.fileStats.largestFiles.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Largest Files</h3>
                    <div className="space-y-2">
                        {overview.fileStats.largestFiles.slice(0, 5).map((file, index) => (
                            <div
                                key={file.path}
                                className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-800/50 border border-surface-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-surface-500 font-mono text-sm">#{index + 1}</span>
                                    <span className="font-mono text-sm truncate max-w-md">{file.path}</span>
                                </div>
                                <span className="text-surface-400 whitespace-nowrap">{file.lines.toLocaleString()} lines</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-yellow-400">Warnings</h3>
                    <div className="space-y-2">
                        {result.warnings.map((warning, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
                            >
                                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-yellow-200">{warning}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
