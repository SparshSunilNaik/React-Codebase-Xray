/**
 * Lint Analyzer
 * Programmatic ESLint analysis for React-specific issues
 */

import { ESLint, Linter } from 'eslint';
import path from 'path';
import { glob } from 'glob';
import type {
    LintIssue,
    LintAnalysisResult,
    IssueSeverity,
    IssueCategory,
} from '@react-codebase-xray/shared';
import {
    normalizePath,
    pathExists,
    generateId,
} from '@react-codebase-xray/shared';

export interface LintAnalyzerOptions {
    projectPath: string;
    extensions?: string[];
}

/**
 * Rule ID to category mapping
 */
const RULE_CATEGORIES: Record<string, IssueCategory> = {
    // React Hooks
    'react-hooks/rules-of-hooks': 'react-hooks',
    'react-hooks/exhaustive-deps': 'react-hooks',

    // Performance
    'react/jsx-no-bind': 'performance',
    'react/no-array-index-key': 'performance',

    // Accessibility
    'jsx-a11y/alt-text': 'accessibility',
    'jsx-a11y/anchor-has-content': 'accessibility',
    'jsx-a11y/aria-props': 'accessibility',
    'jsx-a11y/click-events-have-key-events': 'accessibility',

    // Best Practices
    'react/prop-types': 'best-practices',
    'react/no-deprecated': 'best-practices',
    'react/no-direct-mutation-state': 'best-practices',
    'react/no-unused-state': 'best-practices',
    'no-console': 'best-practices',

    // Security
    'react/no-danger': 'security',
    'react/no-danger-with-children': 'security',

    // TypeScript
    '@typescript-eslint/no-explicit-any': 'typescript',
    '@typescript-eslint/no-unused-vars': 'typescript',
    '@typescript-eslint/explicit-function-return-type': 'typescript',

    // Imports
    'import/no-unresolved': 'imports',
    'import/no-duplicates': 'imports',
    'import/order': 'imports',

    // Unused Code
    'no-unused-vars': 'unused-code',
};

/**
 * Human-readable explanations for common rules
 */
const RULE_EXPLANATIONS: Record<string, string> = {
    'react-hooks/rules-of-hooks':
        'Hooks must be called at the top level of a function component or custom hook. They cannot be called conditionally, in loops, or nested functions.',
    'react-hooks/exhaustive-deps':
        'useEffect, useCallback, and useMemo hooks should include all variables from the component scope that change over time and are used inside the hook.',
    'react/jsx-no-bind':
        'Creating new functions in render causes unnecessary re-renders. Extract the function or use useCallback.',
    'react/no-array-index-key':
        'Using array index as key can cause issues with component state when the array order changes. Use a stable unique identifier instead.',
    'react/no-danger':
        'dangerouslySetInnerHTML can expose your app to XSS attacks. Ensure the content is properly sanitized.',
    '@typescript-eslint/no-explicit-any':
        'Using "any" type defeats the purpose of TypeScript. Consider using a more specific type or "unknown".',
    'no-console':
        'Console statements should be removed from production code. Use a proper logging library instead.',
};

/**
 * Analyze a project for lint issues
 */
export async function analyzeLint(options: LintAnalyzerOptions): Promise<LintAnalysisResult> {
    const { projectPath, extensions = ['.ts', '.tsx', '.js', '.jsx'] } = options;

    try {
        // Create ESLint instance with a basic React config
        const eslint = new ESLint({
            cwd: projectPath,
            overrideConfigFile: await findEslintConfig(projectPath),
            useEslintrc: true,
            errorOnUnmatchedPattern: false,
            // Fallback config if no .eslintrc exists
            overrideConfig: await getDefaultConfig(projectPath),
        });

        // Find files to lint
        const patterns = extensions.map(ext => `**/*${ext}`);
        const files = await glob(patterns, {
            cwd: projectPath,
            nodir: true,
            ignore: ['node_modules/**', 'dist/**', 'build/**', '.next/**', 'coverage/**'],
            absolute: true,
        });

        if (files.length === 0) {
            return {
                issues: [],
                bySeverity: { error: 0, warning: 0, info: 0 },
                byCategory: createEmptyCategoryCount(),
                filesAnalyzed: 0,
                filesWithIssues: 0,
                success: true,
            };
        }

        // Run ESLint
        const results = await eslint.lintFiles(files);

        // Process results
        const issues: LintIssue[] = [];
        let filesWithIssues = 0;

        for (const result of results) {
            if (result.messages.length > 0) {
                filesWithIssues++;
            }

            for (const message of result.messages) {
                issues.push(createLintIssue(result.filePath, message, projectPath));
            }
        }

        // Calculate statistics
        const bySeverity = {
            error: issues.filter(i => i.severity === 'error').length,
            warning: issues.filter(i => i.severity === 'warning').length,
            info: issues.filter(i => i.severity === 'info').length,
        };

        const byCategory = createEmptyCategoryCount();
        for (const issue of issues) {
            byCategory[issue.category]++;
        }

        return {
            issues,
            bySeverity,
            byCategory,
            filesAnalyzed: files.length,
            filesWithIssues,
            success: true,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Return partial result on error
        return {
            issues: [],
            bySeverity: { error: 0, warning: 0, info: 0 },
            byCategory: createEmptyCategoryCount(),
            filesAnalyzed: 0,
            filesWithIssues: 0,
            success: false,
            errorMessage: `Lint analysis failed: ${errorMessage}`,
        };
    }
}

/**
 * Find ESLint config file in project
 */
async function findEslintConfig(projectPath: string): Promise<string | undefined> {
    const configFiles = [
        '.eslintrc.js',
        '.eslintrc.cjs',
        '.eslintrc.json',
        '.eslintrc.yml',
        '.eslintrc.yaml',
        '.eslintrc',
        'eslint.config.js',
        'eslint.config.mjs',
    ];

    for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);
        if (await pathExists(configPath)) {
            return configPath;
        }
    }

    return undefined;
}

/**
 * Get default ESLint config for projects without one
 */
async function getDefaultConfig(projectPath: string): Promise<Linter.Config> {
    // Check if project uses TypeScript
    const hasTypeScript = await pathExists(path.join(projectPath, 'tsconfig.json'));

    const baseConfig: Linter.Config = {
        env: {
            browser: true,
            es2022: true,
            node: true,
        },
        parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ecmaFeatures: {
                jsx: true,
            },
        },
        plugins: ['react', 'react-hooks'],
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'react/no-deprecated': 'warn',
            'react/no-direct-mutation-state': 'error',
            'react/no-danger': 'warn',
            'no-console': 'warn',
            'no-unused-vars': 'warn',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    };

    if (hasTypeScript) {
        baseConfig.parser = '@typescript-eslint/parser';
        baseConfig.plugins = [...(baseConfig.plugins || []), '@typescript-eslint'];
        baseConfig.rules = {
            ...baseConfig.rules,
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
        };
    }

    return baseConfig;
}

/**
 * Create a LintIssue from an ESLint message
 */
function createLintIssue(
    filePath: string,
    message: Linter.LintMessage,
    projectPath: string
): LintIssue {
    const ruleId = message.ruleId || 'unknown';
    const severity = mapSeverity(message.severity);
    const category = RULE_CATEGORIES[ruleId] || 'other';

    return {
        id: generateId(),
        ruleId,
        message: message.message,
        severity,
        category,
        filePath: normalizePath(path.relative(projectPath, filePath)),
        line: message.line,
        column: message.column,
        endLine: message.endLine,
        endColumn: message.endColumn,
        source: message.source || undefined,
        suggestedFix: message.fix ? 'Auto-fixable with --fix flag' : undefined,
        explanation: RULE_EXPLANATIONS[ruleId] || message.message,
        fixable: message.fix !== undefined,
    };
}

/**
 * Map ESLint severity to our severity type
 */
function mapSeverity(eslintSeverity: Linter.Severity): IssueSeverity {
    switch (eslintSeverity) {
        case 2: return 'error';
        case 1: return 'warning';
        default: return 'info';
    }
}

/**
 * Create empty category count object
 */
function createEmptyCategoryCount(): Record<IssueCategory, number> {
    return {
        'react-hooks': 0,
        'performance': 0,
        'accessibility': 0,
        'best-practices': 0,
        'security': 0,
        'typescript': 0,
        'imports': 0,
        'unused-code': 0,
        'other': 0,
    };
}

/**
 * Get a summary of lint analysis
 */
export function getLintSummary(result: LintAnalysisResult): string {
    const lines: string[] = [
        `Files Analyzed: ${result.filesAnalyzed}`,
        `Files with Issues: ${result.filesWithIssues}`,
        `Errors: ${result.bySeverity.error}`,
        `Warnings: ${result.bySeverity.warning}`,
    ];

    if (!result.success) {
        lines.push(``, `Error: ${result.errorMessage}`);
    }

    return lines.join('\n');
}
