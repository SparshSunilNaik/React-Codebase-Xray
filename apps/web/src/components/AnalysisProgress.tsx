interface AnalysisProgressProps {
    message: string;
}

export function AnalysisProgress({ message }: AnalysisProgressProps) {
    return (
        <div className="max-w-md mx-auto text-center animate-fadeIn">
            <div className="glass rounded-xl p-12">
                {/* Animated loader */}
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-surface-700"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-4 rounded-full border-4 border-purple-500 border-b-transparent animate-spin-slow"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <h3 className="text-xl font-semibold mb-2">Analyzing Codebase</h3>
                <p className="text-surface-400 mb-6">{message}</p>

                {/* Progress steps */}
                <div className="space-y-3 text-left">
                    {[
                        'Reading project structure',
                        'Building dependency graph',
                        'Detecting routes',
                        'Running lint analysis',
                        'Checking dependencies',
                    ].map((step, index) => (
                        <div
                            key={step}
                            className="flex items-center gap-3 text-sm"
                            style={{ animationDelay: `${index * 0.2}s` }}
                        >
                            <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                            </div>
                            <span className="text-surface-300">{step}</span>
                        </div>
                    ))}
                </div>
            </div>

            <p className="mt-6 text-sm text-surface-500">
                This may take a moment for large codebases
            </p>
        </div>
    );
}
