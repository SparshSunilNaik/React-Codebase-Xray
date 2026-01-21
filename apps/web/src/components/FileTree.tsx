import { useMemo, useState } from 'react';
import type { FileStats } from '@react-codebase-xray/shared';

interface FileTreeProps {
    fileStats: FileStats;
}

export function FileTree({ fileStats }: FileTreeProps) {
    const [sortBy, setSortBy] = useState<'count' | 'name'>('count');

    const sortedExtensions = useMemo(() => {
        const entries = Object.entries(fileStats.byExtension);

        if (sortBy === 'count') {
            return entries.sort((a, b) => b[1] - a[1]);
        }
        return entries.sort((a, b) => a[0].localeCompare(b[0]));
    }, [fileStats.byExtension, sortBy]);

    const getExtensionColor = (ext: string): string => {
        const colors: Record<string, string> = {
            '.ts': 'text-blue-400',
            '.tsx': 'text-blue-300',
            '.js': 'text-yellow-400',
            '.jsx': 'text-yellow-300',
            '.css': 'text-pink-400',
            '.scss': 'text-pink-300',
            '.json': 'text-green-400',
            '.md': 'text-gray-400',
            '.html': 'text-orange-400',
            '.svg': 'text-purple-400',
        };
        return colors[ext] || 'text-surface-300';
    };

    const getExtensionIcon = (ext: string): string => {
        const icons: Record<string, string> = {
            '.ts': '📘',
            '.tsx': '⚛️',
            '.js': '📒',
            '.jsx': '⚛️',
            '.css': '🎨',
            '.scss': '🎨',
            '.json': '📋',
            '.md': '📝',
            '.html': '🌐',
            '.svg': '🖼️',
            '.png': '🖼️',
            '.jpg': '🖼️',
            '.gif': '🖼️',
        };
        return icons[ext] || '📄';
    };

    const maxCount = Math.max(...Object.values(fileStats.byExtension));

    return (
        <div className="p-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="px-4 py-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                    <p className="text-3xl font-bold text-primary-400">{fileStats.totalFiles.toLocaleString()}</p>
                    <p className="text-surface-400 text-sm">Total Files</p>
                </div>
                <div className="px-4 py-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                    <p className="text-3xl font-bold text-purple-400">{fileStats.totalDirectories.toLocaleString()}</p>
                    <p className="text-surface-400 text-sm">Directories</p>
                </div>
                <div className="px-4 py-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                    <p className="text-3xl font-bold text-green-400">{fileStats.totalLinesOfCode.toLocaleString()}</p>
                    <p className="text-surface-400 text-sm">Lines of Code</p>
                </div>
                <div className="px-4 py-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                    <p className="text-3xl font-bold text-yellow-400">{Object.keys(fileStats.byExtension).length}</p>
                    <p className="text-surface-400 text-sm">File Types</p>
                </div>
            </div>

            {/* File types breakdown */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">File Types</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSortBy('count')}
                            className={`px-3 py-1 rounded text-sm ${sortBy === 'count' ? 'bg-surface-700 text-white' : 'text-surface-400 hover:bg-surface-800'
                                }`}
                        >
                            By Count
                        </button>
                        <button
                            onClick={() => setSortBy('name')}
                            className={`px-3 py-1 rounded text-sm ${sortBy === 'name' ? 'bg-surface-700 text-white' : 'text-surface-400 hover:bg-surface-800'
                                }`}
                        >
                            By Name
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {sortedExtensions.map(([ext, count]) => (
                        <div key={ext} className="flex items-center gap-3">
                            <span className="text-lg">{getExtensionIcon(ext)}</span>
                            <span className={`font-mono text-sm w-16 ${getExtensionColor(ext)}`}>
                                {ext || '(none)'}
                            </span>
                            <div className="flex-1 h-6 bg-surface-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(count / maxCount) * 100}%` }}
                                />
                            </div>
                            <span className="text-surface-400 text-sm w-16 text-right">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Largest files */}
            {fileStats.largestFiles.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Largest Files</h3>
                    <div className="space-y-2">
                        {fileStats.largestFiles.map((file, index) => (
                            <div
                                key={file.path}
                                className="flex items-center gap-4 px-4 py-3 rounded-lg bg-surface-800/50 border border-surface-700/50"
                            >
                                <span className="text-surface-500 font-mono text-sm w-8">#{index + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-sm truncate">{file.path}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-surface-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full"
                                            style={{
                                                width: `${Math.min((file.lines / fileStats.largestFiles[0].lines) * 100, 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-surface-400 text-sm whitespace-nowrap">
                                        {file.lines.toLocaleString()} lines
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
