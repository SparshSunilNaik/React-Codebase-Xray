import { useState } from 'react';
import type { AnalysisResult } from '@react-codebase-xray/shared';
import { ProjectOverview } from './ProjectOverview';
import { DependencyGraph } from './DependencyGraph';
import { RouteMap } from './RouteMap';
import { IssuesList } from './IssuesList';
import { FileTree } from './FileTree';
import { DiagnosticsPanel } from './DiagnosticsPanel';

interface DashboardProps {
    result: AnalysisResult;
    onRunDiagnostics: () => void;
}

type TabId = 'overview' | 'dependencies' | 'routes' | 'issues' | 'files' | 'diagnostics';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
}

export function Dashboard({ result, onRunDiagnostics }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    const tabs: Tab[] = [
        {
            id: 'overview',
            label: 'Overview',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ),
        },
        {
            id: 'dependencies',
            label: 'Dependencies',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            ),
            badge: result.dependencyGraph.circularDependencies.length > 0
                ? result.dependencyGraph.circularDependencies.length
                : undefined,
            badgeColor: 'bg-yellow-500',
        },
        {
            id: 'routes',
            label: 'Routes',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            ),
            badge: result.routes.totalRoutes > 0 ? result.routes.totalRoutes : undefined,
            badgeColor: 'bg-primary-500',
        },
        {
            id: 'issues',
            label: 'Issues',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            badge: result.lint.bySeverity.error > 0 ? result.lint.bySeverity.error : undefined,
            badgeColor: 'bg-red-500',
        },
        {
            id: 'files',
            label: 'Files',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
            ),
        },
        {
            id: 'diagnostics',
            label: 'Diagnostics',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            ),
            badge: result.diagnostics ? (result.diagnostics.success ? '✓' : '✗') : undefined,
            badgeColor: result.diagnostics?.success ? 'bg-green-500' : 'bg-red-500',
        },
    ];

    const handleDownloadReport = async (format: 'json' | 'markdown') => {
        try {
            const response = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result, format }),
            });

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `xray-report.${format === 'markdown' ? 'md' : 'json'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download report:', error);
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Tab navigation */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                    : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.badge !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-xs text-white ${tab.badgeColor}`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Download buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => handleDownloadReport('json')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        JSON
                    </button>
                    <button
                        onClick={() => handleDownloadReport('markdown')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Markdown
                    </button>
                </div>
            </div>

            {/* Tab content */}
            <div className="glass rounded-xl overflow-hidden">
                {activeTab === 'overview' && <ProjectOverview result={result} />}
                {activeTab === 'dependencies' && <DependencyGraph result={result.dependencyGraph} />}
                {activeTab === 'routes' && <RouteMap result={result.routes} />}
                {activeTab === 'issues' && <IssuesList result={result.lint} dependencies={result.dependencies} />}
                {activeTab === 'files' && <FileTree fileStats={result.overview.fileStats} />}
                {activeTab === 'diagnostics' && (
                    <DiagnosticsPanel
                        result={result.diagnostics}
                        projectPath={result.config.projectPath}
                        onRunDiagnostics={onRunDiagnostics}
                    />
                )}
            </div>
        </div>
    );
}
