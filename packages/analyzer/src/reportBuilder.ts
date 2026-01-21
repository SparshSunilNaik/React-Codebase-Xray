/**
 * Report Builder
 * Generates exportable JSON and Markdown reports
 */

import type { AnalysisResult } from '@react-codebase-xray/shared';
import { formatDuration } from '@react-codebase-xray/shared';

/**
 * Generate a JSON report
 */
export function generateJsonReport(result: AnalysisResult): string {
    return JSON.stringify(result, null, 2);
}

/**
 * Generate a Markdown report
 */
export function generateMarkdownReport(result: AnalysisResult): string {
    const lines: string[] = [];

    // Header
    lines.push(`# React Codebase X-Ray Report`);
    lines.push('');
    lines.push(`**Project:** ${result.overview.name}`);
    lines.push(`**Analyzed:** ${result.overview.analyzedAt}`);
    lines.push(`**Duration:** ${formatDuration(result.duration)}`);
    lines.push('');

    // Quick Summary
    lines.push('## Quick Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Files | ${result.overview.fileStats.totalFiles} |`);
    lines.push(`| Total Lines of Code | ${result.overview.fileStats.totalLinesOfCode.toLocaleString()} |`);
    lines.push(`| Total Modules | ${result.dependencyGraph.totalModules} |`);
    lines.push(`| Circular Dependencies | ${result.dependencyGraph.circularDependencies.length} |`);
    lines.push(`| Total Routes | ${result.routes.totalRoutes} |`);
    lines.push(`| Lint Issues | ${result.lint.issues.length} |`);
    lines.push(`| Unused Dependencies | ${result.dependencies.unused.length} |`);
    lines.push('');

    // Project Overview
    lines.push('## Project Overview');
    lines.push('');
    lines.push(`- **Framework:** ${result.overview.framework.name}${result.overview.framework.version ? ` v${result.overview.framework.version}` : ''}`);
    lines.push(`- **TypeScript:** ${result.overview.packageJson.hasTypeScript ? 'Yes' : 'No'}`);
    lines.push(`- **Tailwind CSS:** ${result.overview.packageJson.hasTailwind ? 'Yes' : 'No'}`);
    lines.push(`- **ESLint:** ${result.overview.packageJson.hasEslint ? 'Yes' : 'No'}`);
    lines.push('');

    // File Types Breakdown
    lines.push('### File Types');
    lines.push('');
    const extensions = Object.entries(result.overview.fileStats.byExtension)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    lines.push('| Extension | Count |');
    lines.push('|-----------|-------|');
    for (const [ext, count] of extensions) {
        lines.push(`| ${ext || '(no ext)'} | ${count} |`);
    }
    lines.push('');

    // Dependency Graph
    lines.push('## Dependency Analysis');
    lines.push('');
    lines.push(`- **Total Modules:** ${result.dependencyGraph.totalModules}`);
    lines.push(`- **Average Dependencies per Module:** ${result.dependencyGraph.averageDependencies}`);
    lines.push(`- **Orphaned Modules:** ${result.dependencyGraph.orphanedModules.length}`);
    lines.push('');

    // Circular Dependencies
    if (result.dependencyGraph.circularDependencies.length > 0) {
        lines.push('### ⚠️ Circular Dependencies');
        lines.push('');
        lines.push('Circular dependencies can cause issues with code splitting, testing, and maintenance.');
        lines.push('');

        const circulars = result.dependencyGraph.circularDependencies.slice(0, 10);
        for (const cd of circulars) {
            lines.push(`- ${cd.chain.join(' → ')}`);
        }

        if (result.dependencyGraph.circularDependencies.length > 10) {
            lines.push(`- ... and ${result.dependencyGraph.circularDependencies.length - 10} more`);
        }
        lines.push('');
    }

    // Routes
    lines.push('## Routes');
    lines.push('');
    lines.push(`- **Router Type:** ${result.routes.routerType}`);
    lines.push(`- **Total Routes:** ${result.routes.totalRoutes}`);
    lines.push(`- **API Routes:** ${result.routes.apiRoutes}`);
    lines.push(`- **Dynamic Routes:** ${result.routes.dynamicRoutes}`);
    lines.push('');

    if (result.routes.routes.length > 0) {
        lines.push('### Route List');
        lines.push('');
        lines.push('| Path | Type | API |');
        lines.push('|------|------|-----|');

        const routes = result.routes.routes.slice(0, 20);
        for (const route of routes) {
            const apiFlag = route.isApi ? '✓' : '';
            lines.push(`| \`${route.path}\` | ${route.type} | ${apiFlag} |`);
        }

        if (result.routes.routes.length > 20) {
            lines.push(`| ... | ${result.routes.routes.length - 20} more | |`);
        }
        lines.push('');
    }

    // Lint Issues
    lines.push('## Lint Issues');
    lines.push('');
    lines.push(`- **Total Issues:** ${result.lint.issues.length}`);
    lines.push(`- **Errors:** ${result.lint.bySeverity.error}`);
    lines.push(`- **Warnings:** ${result.lint.bySeverity.warning}`);
    lines.push(`- **Info:** ${result.lint.bySeverity.info}`);
    lines.push('');

    if (result.lint.issues.length > 0) {
        // Group by category
        const byCategory = new Map<string, typeof result.lint.issues>();
        for (const issue of result.lint.issues) {
            const list = byCategory.get(issue.category) || [];
            list.push(issue);
            byCategory.set(issue.category, list);
        }

        lines.push('### Issues by Category');
        lines.push('');

        for (const [category, issues] of byCategory) {
            lines.push(`#### ${formatCategoryName(category)} (${issues.length})`);
            lines.push('');

            const topIssues = issues.slice(0, 5);
            for (const issue of topIssues) {
                const severity = getSeverityEmoji(issue.severity);
                lines.push(`- ${severity} **${issue.ruleId}** in \`${issue.filePath}:${issue.line}\``);
                lines.push(`  ${issue.message}`);
            }

            if (issues.length > 5) {
                lines.push(`- ... and ${issues.length - 5} more ${category} issues`);
            }
            lines.push('');
        }
    }

    // Dependencies
    lines.push('## Dependencies');
    lines.push('');
    lines.push(`- **Total Dependencies:** ${result.dependencies.totalDependencies}`);
    lines.push(`- **Total Dev Dependencies:** ${result.dependencies.totalDevDependencies}`);
    lines.push(`- **Unused:** ${result.dependencies.unused.length}`);
    lines.push(`- **Missing:** ${result.dependencies.missing.length}`);
    lines.push('');

    if (result.dependencies.unused.length > 0) {
        lines.push('### Unused Dependencies');
        lines.push('');
        lines.push('These packages are listed in package.json but no imports were found:');
        lines.push('');

        for (const dep of result.dependencies.unused.slice(0, 15)) {
            const devLabel = dep.isDev ? ' (dev)' : '';
            lines.push(`- \`${dep.name}\`${devLabel}`);
        }

        if (result.dependencies.unused.length > 15) {
            lines.push(`- ... and ${result.dependencies.unused.length - 15} more`);
        }
        lines.push('');
    }

    if (result.dependencies.missing.length > 0) {
        lines.push('### Missing Dependencies');
        lines.push('');
        lines.push('These packages are imported but not listed in package.json:');
        lines.push('');

        for (const dep of result.dependencies.missing.slice(0, 10)) {
            lines.push(`- \`${dep.name}\` (used in ${dep.usedIn.length} file(s))`);
        }

        if (result.dependencies.missing.length > 10) {
            lines.push(`- ... and ${result.dependencies.missing.length - 10} more`);
        }
        lines.push('');
    }

    // Diagnostics (if run)
    if (result.diagnostics) {
        lines.push('## Diagnostics');
        lines.push('');

        for (const step of result.diagnostics.steps) {
            const status = step.success ? '✅' : '❌';
            const time = formatDuration(step.duration);
            lines.push(`- ${status} \`${step.fullCommand}\` (${time})`);
        }
        lines.push('');

        if (result.diagnostics.errors.length > 0) {
            lines.push('### Detected Errors');
            lines.push('');

            for (const error of result.diagnostics.errors) {
                lines.push(`#### ${error.type}`);
                lines.push('');
                lines.push(`**Message:** ${error.message}`);
                lines.push('');
                lines.push(`**Probable Cause:** ${error.probableCause}`);
                lines.push('');
                lines.push(`**Suggested Fix:** ${error.suggestedFix}`);
                lines.push('');
            }
        }
    }

    // Warnings
    if (result.warnings.length > 0) {
        lines.push('## Warnings');
        lines.push('');
        for (const warning of result.warnings) {
            lines.push(`- ⚠️ ${warning}`);
        }
        lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Generated by [React Codebase X-Ray](https://github.com/react-codebase-xray)*');

    return lines.join('\n');
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
    return category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Get emoji for severity
 */
function getSeverityEmoji(severity: string): string {
    switch (severity) {
        case 'error': return '🔴';
        case 'warning': return '🟡';
        case 'info': return '🔵';
        default: return '⚪';
    }
}
