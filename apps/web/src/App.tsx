import { useState, useCallback } from 'react';
import type { AnalysisResult } from '@react-codebase-xray/shared';
import { Header } from './components/Header';
import { ProjectInput } from './components/ProjectInput';
import { AnalysisProgress } from './components/AnalysisProgress';
import { Dashboard } from './components/Dashboard';

type AppState = 'idle' | 'analyzing' | 'complete' | 'error';

function App() {
    const [state, setState] = useState<AppState>('idle');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');

    const handleAnalyze = useCallback(async (path: string, isZip: boolean) => {
        setState('analyzing');
        setError(null);
        setProgress('Starting analysis...');

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, isZip }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            setResult(data.result);
            setState('complete');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setState('error');
        }
    }, []);

    const handleUploadZip = useCallback(async (file: File) => {
        setState('analyzing');
        setError(null);
        setProgress('Uploading and analyzing ZIP file...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload-zip', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            setResult(data.result);
            setState('complete');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setState('error');
        }
    }, []);

    const handleReset = useCallback(() => {
        setState('idle');
        setResult(null);
        setError(null);
        setProgress('');
    }, []);

    const handleRunDiagnostics = useCallback(async () => {
        if (!result) return;

        setState('analyzing');
        setProgress('Running diagnostics (this may take a few minutes)...');

        try {
            const response = await fetch('/api/diagnostics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectPath: result.config.projectPath,
                    commands: ['install', 'build', 'test'],
                    confirmed: true,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Diagnostics failed');
            }

            // Update result with diagnostics
            setResult({
                ...result,
                diagnostics: data.result,
            });
            setState('complete');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Diagnostics failed');
            setState('error');
        }
    }, [result]);

    return (
        <div className="min-h-screen flex flex-col">
            <Header onReset={state === 'complete' ? handleReset : undefined} />

            <main className="flex-1 container mx-auto px-4 py-8">
                {state === 'idle' && (
                    <ProjectInput
                        onAnalyze={handleAnalyze}
                        onUploadZip={handleUploadZip}
                    />
                )}

                {state === 'analyzing' && (
                    <AnalysisProgress message={progress} />
                )}

                {state === 'error' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="glass rounded-xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-red-400 mb-2">Analysis Failed</h2>
                            <p className="text-surface-400 mb-6">{error}</p>
                            <button
                                onClick={handleReset}
                                className="px-6 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {state === 'complete' && result && (
                    <Dashboard
                        result={result}
                        onRunDiagnostics={handleRunDiagnostics}
                    />
                )}
            </main>

            <footer className="py-4 text-center text-surface-500 text-sm">
                <p>React Codebase X-Ray • 100% Local • Open Source</p>
            </footer>
        </div>
    );
}

export default App;
