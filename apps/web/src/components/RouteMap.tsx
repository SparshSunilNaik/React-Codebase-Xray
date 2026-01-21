import { useState } from 'react';
import type { RouteDetectionResult, RouteInfo } from '@react-codebase-xray/shared';

interface RouteMapProps {
    result: RouteDetectionResult;
}

export function RouteMap({ result }: RouteMapProps) {
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'all' | 'page' | 'api' | 'dynamic'>('all');

    const filteredRoutes = result.routes.filter(route => {
        if (filter === 'all') return true;
        if (filter === 'api') return route.isApi;
        if (filter === 'dynamic') return route.hasDynamicSegments;
        return !route.isApi;
    });

    const toggleExpand = (path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const getRouteTypeColor = (route: RouteInfo) => {
        if (route.isApi) return 'text-red-400 bg-red-500/10 border-red-500/30';
        if (route.hasDynamicSegments) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        return 'text-green-400 bg-green-500/10 border-green-500/30';
    };

    const getRouteTypeLabel = (route: RouteInfo) => {
        if (route.isApi) return 'API';
        if (route.type === 'catch-all') return 'Catch-all';
        if (route.type === 'dynamic') return 'Dynamic';
        return 'Static';
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-semibold">Route Map</h3>
                    <p className="text-surface-400 text-sm">
                        Router: <span className="text-primary-400">{result.routerType}</span>
                    </p>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm">
                    <div className="px-3 py-1 rounded-lg bg-surface-800">
                        <span className="text-surface-400">Total: </span>
                        <span className="font-medium">{result.totalRoutes}</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-surface-800">
                        <span className="text-surface-400">API: </span>
                        <span className="font-medium text-red-400">{result.apiRoutes}</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-surface-800">
                        <span className="text-surface-400">Dynamic: </span>
                        <span className="font-medium text-yellow-400">{result.dynamicRoutes}</span>
                    </div>
                </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2 mb-6">
                {(['all', 'page', 'api', 'dynamic'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${filter === f
                                ? 'bg-primary-500 text-white'
                                : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                            }`}
                    >
                        {f === 'page' ? 'Pages' : f}
                    </button>
                ))}
            </div>

            {/* Route list */}
            {filteredRoutes.length === 0 ? (
                <div className="text-center py-12 text-surface-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p>No routes found</p>
                    {result.warnings.length > 0 && (
                        <p className="text-sm mt-2">{result.warnings[0]}</p>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredRoutes.map((route, index) => (
                        <RouteItem
                            key={`${route.path}-${index}`}
                            route={route}
                            isExpanded={expandedPaths.has(route.path)}
                            onToggle={() => toggleExpand(route.path)}
                            getTypeColor={getRouteTypeColor}
                            getTypeLabel={getRouteTypeLabel}
                        />
                    ))}
                </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-yellow-400 font-medium mb-2">Warnings</p>
                    {result.warnings.map((warning, index) => (
                        <p key={index} className="text-yellow-200 text-sm">{warning}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

interface RouteItemProps {
    route: RouteInfo;
    isExpanded: boolean;
    onToggle: () => void;
    getTypeColor: (route: RouteInfo) => string;
    getTypeLabel: (route: RouteInfo) => string;
}

function RouteItem({ route, isExpanded, onToggle, getTypeColor, getTypeLabel }: RouteItemProps) {
    return (
        <div className="rounded-lg bg-surface-800/50 border border-surface-700/50 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-700/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="font-mono text-primary-400">{route.path}</span>
                    <span className={`px-2 py-0.5 rounded text-xs border ${getTypeColor(route)}`}>
                        {getTypeLabel(route)}
                    </span>
                    {route.methods && route.methods.length > 0 && (
                        <div className="flex gap-1">
                            {route.methods.map(method => (
                                <span
                                    key={method}
                                    className="px-1.5 py-0.5 rounded text-xs bg-surface-700 text-surface-300"
                                >
                                    {method}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isExpanded && (
                <div className="px-4 py-3 border-t border-surface-700/50 bg-surface-900/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-surface-400">File:</span>
                            <p className="font-mono text-xs mt-1 truncate">{route.filePath}</p>
                        </div>
                        <div>
                            <span className="text-surface-400">Type:</span>
                            <p className="mt-1 capitalize">{route.type}</p>
                        </div>
                        {route.dynamicSegments.length > 0 && (
                            <div className="col-span-2">
                                <span className="text-surface-400">Dynamic Segments:</span>
                                <div className="flex gap-2 mt-1">
                                    {route.dynamicSegments.map(segment => (
                                        <span
                                            key={segment}
                                            className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-mono"
                                        >
                                            :{segment}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Child routes */}
                    {route.children.length > 0 && (
                        <div className="mt-4">
                            <p className="text-surface-400 text-sm mb-2">Nested Routes:</p>
                            <div className="space-y-2 pl-4 border-l-2 border-surface-700">
                                {route.children.map((child, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="font-mono text-primary-400 text-sm">{child.path}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs border ${getRouteTypeColorStatic(child)}`}>
                                            {getRouteTypeLabelStatic(child)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function getRouteTypeColorStatic(route: RouteInfo) {
    if (route.isApi) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (route.hasDynamicSegments) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
}

function getRouteTypeLabelStatic(route: RouteInfo) {
    if (route.isApi) return 'API';
    if (route.type === 'catch-all') return 'Catch-all';
    if (route.type === 'dynamic') return 'Dynamic';
    return 'Static';
}
