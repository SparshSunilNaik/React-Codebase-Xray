import { useState, useMemo } from 'react';
import type { LintAnalysisResult, DependencyAnalysisResult, LintIssue } from '@react-codebase-xray/shared';

interface IssuesListProps {
    result: LintAnalysisResult;
    dependencies: DependencyAnalysisResult;
}

type IssueTab = 'lint' | 'unused' | 'missing';
type SeverityFilter = 'all' | 'error' | 'warning' | 'info';

export function IssuesList({ result, dependencies }: IssuesListProps) {
    const [activeTab, setActiveTab] = useState<IssueTab>('lint');
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
    const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

    const filteredIssues = useMemo(() => {
        if (severityFilter === 'all') return result.issues;
        return result.issues.filter(issue => issue.severity === severityFilter);
    }, [result.issues, severityFilter]);

    const toggleExpand = (id: string) => {
        setExpandedIssues(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'error':
                return <span className="text-red-400">🔴</span>;
            case 'warning':
                return <span className="text-yellow-400">🟡</span>;
            case 'info':
                return <span className="text-blue-400">🔵</span>;
            default:
                return <span className="text-surface-400">⚪</span>;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'error': return 'border-red-500/30 bg-red-500/5';
            case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
            case 'info': return 'border-blue-500/30 bg-blue-500/5';
            default: return 'border-surface-700 bg-surface-800/50';
        }
    };

    return (
        <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('lint')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'lint'
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                        }`}
                >
                    Lint Issues
                    {result.issues.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
                            {result.issues.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('unused')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'unused'
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                        }`}
                >
                    Unused Deps
                    {dependencies.unused.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500 text-white text-xs">
                            {dependencies.unused.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('missing')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'missing'
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                        }`}
                >
                    Missing Deps
                    {dependencies.missing.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
                            {dependencies.missing.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Lint issues tab */}
            {activeTab === 'lint' && (
                <>
                    {/* Summary */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800">
                            <span className="text-surface-400">Files analyzed:</span>
                            <span className="font-medium">{result.filesAnalyzed}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800">
                            <span className="text-surface-400">With issues:</span>
                            <span className="font-medium">{result.filesWithIssues}</span>
                        </div>
                    </div>

                    {/* Severity filter */}
                    <div className="flex gap-2 mb-6">
                        {(['all', 'error', 'warning', 'info'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setSeverityFilter(s)}
                                className={`px-3 py-1 rounded-lg text-sm transition-all capitalize ${severityFilter === s
                                        ? 'bg-surface-700 text-white'
                                        : 'bg-surface-800/50 text-surface-400 hover:bg-surface-700'
                                    }`}
                            >
                                {s}
                                {s !== 'all' && (
                                    <span className="ml-1 opacity-70">({result.bySeverity[s]})</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Issues list */}
                    {filteredIssues.length === 0 ? (
                        <div className="text-center py-12 text-surface-400">
                            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>No issues found</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {filteredIssues.map((issue) => (
                                <IssueItem
                                    key={issue.id}
                                    issue={issue}
                                    isExpanded={expandedIssues.has(issue.id)}
                                    onToggle={() => toggleExpand(issue.id)}
                                    getSeverityIcon={getSeverityIcon}
                                    getSeverityColor={getSeverityColor}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Unused dependencies tab */}
            {activeTab === 'unused' && (
                <>
                    {dependencies.unused.length === 0 ? (
                        <div className="text-center py-12 text-surface-400">
                            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>All dependencies are in use</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {dependencies.unused.map((dep) => (
                                <div
                                    key={dep.name}
                                    className="px-4 py-3 rounded-lg bg-surface-800/50 border border-yellow-500/30"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-yellow-400">📦</span>
                                            <span className="font-mono font-medium">{dep.name}</span>
                                            <span className="text-surface-400 text-sm">{dep.version}</span>
                                            {dep.isDev && (
                                                <span className="px-2 py-0.5 rounded text-xs bg-surface-700 text-surface-300">
                                                    dev
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-surface-400 text-sm mt-2">{dep.reason}</p>
                                    <div className="mt-3">
                                        <code className="text-xs text-surface-500 font-mono">
                                            npm uninstall {dep.name}
                                        </code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Missing dependencies tab */}
            {activeTab === 'missing' && (
                <>
                    {dependencies.missing.length === 0 ? (
                        <div className="text-center py-12 text-surface-400">
                            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>All imported packages are installed</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {dependencies.missing.map((dep) => (
                                <div
                                    key={dep.name}
                                    className="px-4 py-3 rounded-lg bg-surface-800/50 border border-red-500/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-red-400">❌</span>
                                        <span className="font-mono font-medium">{dep.name}</span>
                                    </div>
                                    <div className="mt-2">
                                        <p className="text-surface-400 text-sm">Used in {dep.usedIn.length} file(s):</p>
                                        <div className="mt-1 text-xs font-mono text-surface-500 max-h-20 overflow-y-auto">
                                            {dep.usedIn.slice(0, 5).map((file, i) => (
                                                <div key={i}>{file}</div>
                                            ))}
                                            {dep.usedIn.length > 5 && (
                                                <div>... and {dep.usedIn.length - 5} more</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <code className="text-xs text-surface-500 font-mono">
                                            npm install {dep.name}
                                        </code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

interface IssueItemProps {
    issue: LintIssue;
    isExpanded: boolean;
    onToggle: () => void;
    getSeverityIcon: (severity: string) => JSX.Element;
    getSeverityColor: (severity: string) => string;
}

function IssueItem({ issue, isExpanded, onToggle, getSeverityIcon, getSeverityColor }: IssueItemProps) {
    return (
        <div className={`rounded-lg border ${getSeverityColor(issue.severity)} overflow-hidden`}>
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-surface-700/30 transition-colors"
            >
                {getSeverityIcon(issue.severity)}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-primary-400">{issue.ruleId}</span>
                        <span className="text-surface-500 text-xs">
                            {issue.filePath}:{issue.line}:{issue.column}
                        </span>
                    </div>
                    <p className="text-sm mt-1 text-surface-200">{issue.message}</p>
                </div>
                <svg
                    className={`w-4 h-4 text-surface-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isExpanded && (
                <div className="px-4 py-3 border-t border-surface-700/50 bg-surface-900/50">
                    <div className="text-sm">
                        <p className="text-surface-400 mb-2">Explanation:</p>
                        <p className="text-surface-200">{issue.explanation}</p>
                    </div>

                    {issue.source && (
                        <div className="mt-3">
                            <p className="text-surface-400 text-sm mb-2">Source:</p>
                            <pre className="text-xs font-mono bg-surface-800 p-2 rounded overflow-x-auto">
                                {issue.source}
                            </pre>
                        </div>
                    )}

                    {issue.suggestedFix && (
                        <div className="mt-3 px-3 py-2 rounded bg-green-500/10 border border-green-500/30">
                            <p className="text-green-400 text-sm">💡 {issue.suggestedFix}</p>
                        </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-surface-400">
                        <span>Category: <span className="text-surface-300 capitalize">{issue.category.replace('-', ' ')}</span></span>
                        {issue.fixable && (
                            <span className="text-green-400">✓ Auto-fixable</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
