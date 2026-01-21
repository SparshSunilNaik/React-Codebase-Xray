import { useState } from 'react';
import type { DiagnosticResult } from '@react-codebase-xray/shared';

interface DiagnosticsPanelProps {
    result?: DiagnosticResult;
    projectPath: string;
    onRunDiagnostics: () => void;
}

export function DiagnosticsPanel({ result, projectPath, onRunDiagnostics }: DiagnosticsPanelProps) {
    const [confirmed, setConfirmed] = useState(false);

    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };

    // If diagnostics haven't been run yet
    if (!result) {
        return (
            <div className="p-6">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-semibold mb-4">Diagnostics Mode</h3>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-left">
                        <p className="text-yellow-400 font-medium mb-2">⚠️ Security Warning</p>
                        <p className="text-yellow-200 text-sm">
                            Diagnostics mode will execute the following commands on your machine:
                        </p>
                        <ul className="mt-2 text-sm text-yellow-200 space-y-1">
                            <li className="font-mono">• npm install --legacy-peer-deps</li>
                            <li className="font-mono">• npm run build</li>
                            <li className="font-mono">• npm test -- --passWithNoTests</li>
                        </ul>
                        <p className="text-yellow-200 text-sm mt-3">
                            Only proceed if you trust the codebase at:
                        </p>
                        <p className="font-mono text-xs text-yellow-300 mt-1 break-all">{projectPath}</p>
                    </div>

                    <label className="flex items-center justify-center gap-3 mb-6 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                            className="w-5 h-5 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-surface-300">
                            I understand and want to run diagnostics
                        </span>
                    </label>

                    <button
                        onClick={onRunDiagnostics}
                        disabled={!confirmed}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Run Diagnostics
                    </button>
                </div>
            </div>
        );
    }

    // Show diagnostics results
    return (
        <div className="p-6">
            {/* Summary */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.success ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                        {result.success ? (
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">
                            {result.success ? 'All Checks Passed' : 'Issues Found'}
                        </h3>
                        <p className="text-surface-400 text-sm">
                            Completed in {formatDuration(result.totalDuration)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-4 mb-8">
                {result.steps.map((step, index) => (
                    <div
                        key={index}
                        className={`rounded-lg border overflow-hidden ${step.success
                                ? 'border-green-500/30 bg-green-500/5'
                                : 'border-red-500/30 bg-red-500/5'
                            }`}
                    >
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                                {step.success ? (
                                    <span className="text-green-400">✓</span>
                                ) : step.timedOut ? (
                                    <span className="text-yellow-400">⏱</span>
                                ) : (
                                    <span className="text-red-400">✗</span>
                                )}
                                <span className="font-mono text-sm">{step.fullCommand}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-surface-400">{formatDuration(step.duration)}</span>
                                {step.timedOut && (
                                    <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                                        Timed Out
                                    </span>
                                )}
                                {step.exitCode !== null && (
                                    <span className={`px-2 py-0.5 rounded text-xs ${step.exitCode === 0
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        Exit: {step.exitCode}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Output */}
                        {(step.stdout || step.stderr) && (
                            <details className="border-t border-surface-700/50">
                                <summary className="px-4 py-2 text-sm text-surface-400 cursor-pointer hover:bg-surface-700/30">
                                    View Output
                                </summary>
                                <div className="px-4 py-3 bg-surface-900/50 max-h-60 overflow-y-auto">
                                    {step.stderr && (
                                        <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-all">
                                            {step.stderr.slice(0, 5000)}
                                            {step.stderr.length > 5000 && '\n... (truncated)'}
                                        </pre>
                                    )}
                                    {step.stdout && (
                                        <pre className="text-xs font-mono text-surface-300 whitespace-pre-wrap break-all">
                                            {step.stdout.slice(0, 5000)}
                                            {step.stdout.length > 5000 && '\n... (truncated)'}
                                        </pre>
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                ))}
            </div>

            {/* Parsed errors */}
            {result.errors.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold mb-4">Detected Issues</h4>
                    <div className="space-y-4">
                        {result.errors.map((error, index) => (
                            <div
                                key={index}
                                className="rounded-lg border border-red-500/30 bg-red-500/5 p-4"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-mono">
                                        {error.type}
                                    </span>
                                    <span className="text-surface-400 text-xs">
                                        Confidence: {Math.round(error.confidence * 100)}%
                                    </span>
                                </div>

                                <p className="font-medium mb-2">{error.message}</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-surface-400 mb-1">Probable Cause:</p>
                                        <p className="text-surface-200">{error.probableCause}</p>
                                    </div>
                                    <div>
                                        <p className="text-surface-400 mb-1">Suggested Fix:</p>
                                        <p className="text-green-300">{error.suggestedFix}</p>
                                    </div>
                                </div>

                                {error.files.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-surface-400 text-sm mb-1">Related Files:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {error.files.slice(0, 5).map((file, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-1 rounded bg-surface-800 text-xs font-mono text-surface-300"
                                                >
                                                    {file}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary text */}
            <div className="mt-8 p-4 rounded-lg bg-surface-800/50 border border-surface-700">
                <h4 className="font-medium mb-2">Summary</h4>
                <pre className="text-sm text-surface-300 whitespace-pre-wrap font-mono">
                    {result.summary}
                </pre>
            </div>
        </div>
    );
}
