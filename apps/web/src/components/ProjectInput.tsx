import { useState, useCallback, useRef } from 'react';

interface ProjectInputProps {
    onAnalyze: (path: string, isZip: boolean) => void;
    onUploadZip: (file: File) => void;
}

export function ProjectInput({ onAnalyze, onUploadZip }: ProjectInputProps) {
    const [inputMode, setInputMode] = useState<'folder' | 'zip'>('folder');
    const [folderPath, setFolderPath] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (folderPath.trim()) {
            onAnalyze(folderPath.trim(), false);
        }
    }, [folderPath, onAnalyze]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.zip')) {
            onUploadZip(file);
        }
    }, [onUploadZip]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadZip(file);
        }
    }, [onUploadZip]);

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            {/* Hero section */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm mb-6">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    100% Local • No Data Leaves Your Machine
                </div>
                <h2 className="text-4xl font-bold mb-4">
                    <span className="gradient-text">Analyze Your React Codebase</span>
                </h2>
                <p className="text-surface-400 text-lg max-w-xl mx-auto">
                    Get instant insights into dependencies, routes, circular imports, and potential issues.
                </p>
            </div>

            {/* Mode selector */}
            <div className="flex justify-center gap-2 mb-8">
                <button
                    onClick={() => setInputMode('folder')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${inputMode === 'folder'
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                            : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        Local Folder
                    </span>
                </button>
                <button
                    onClick={() => setInputMode('zip')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${inputMode === 'zip'
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                            : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload ZIP
                    </span>
                </button>
            </div>

            {/* Folder input mode */}
            {inputMode === 'folder' && (
                <form onSubmit={handleSubmit} className="glass rounded-xl p-8">
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                        Project Path
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={folderPath}
                            onChange={(e) => setFolderPath(e.target.value)}
                            placeholder="C:\Users\you\projects\my-react-app"
                            className="flex-1 px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!folderPath.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/25"
                        >
                            Analyze
                        </button>
                    </div>
                    <p className="mt-3 text-sm text-surface-500">
                        Enter the absolute path to your React project folder
                    </p>
                </form>
            )}

            {/* ZIP upload mode */}
            {inputMode === 'zip' && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`glass rounded-xl p-12 text-center cursor-pointer transition-all ${isDragging
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-surface-600 hover:border-surface-500'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all ${isDragging ? 'bg-primary-500/20' : 'bg-surface-800'
                        }`}>
                        <svg className={`w-8 h-8 ${isDragging ? 'text-primary-400' : 'text-surface-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>

                    <p className="text-lg font-medium mb-2">
                        {isDragging ? 'Drop your ZIP file here' : 'Drag & drop a ZIP file'}
                    </p>
                    <p className="text-surface-400">
                        or click to browse your files
                    </p>
                </div>
            )}

            {/* Features list */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                {[
                    { icon: '🔗', label: 'Dependency Graph' },
                    { icon: '🛣️', label: 'Route Map' },
                    { icon: '🔄', label: 'Circular Deps' },
                    { icon: '📦', label: 'Unused Packages' },
                ].map((feature) => (
                    <div key={feature.label} className="glass rounded-lg p-4 text-center">
                        <span className="text-2xl mb-2 block">{feature.icon}</span>
                        <span className="text-sm text-surface-300">{feature.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
