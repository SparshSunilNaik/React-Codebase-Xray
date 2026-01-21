/**
 * Diagnostics Runner
 * Runs npm commands in a sandboxed environment with timeouts
 * 
 * ⚠️ SECURITY NOTE: This module executes npm commands.
 * It is strictly opt-in and should only run whitelisted commands.
 */

import { spawn, ChildProcess } from 'child_process';
import type {
    DiagnosticResult,
    DiagnosticStep,
    DiagnosticError,
    DiagnosticCommand,
} from '@react-codebase-xray/shared';
import {
    extractFilePaths,
} from '@react-codebase-xray/shared';

export interface DiagnosticsOptions {
    projectPath: string;
    commands: DiagnosticCommand[];
    timeout?: number; // Per-command timeout in ms
}

// Whitelisted commands - ONLY these are allowed
const ALLOWED_COMMANDS: Record<DiagnosticCommand, string[]> = {
    install: ['npm', 'install', '--legacy-peer-deps'],
    build: ['npm', 'run', 'build'],
    test: ['npm', 'run', 'test', '--', '--passWithNoTests'],
};

/**
 * Run diagnostics on a project
 * ⚠️ This executes npm commands - use with caution
 */
export async function runDiagnostics(options: DiagnosticsOptions): Promise<DiagnosticResult> {
    const { projectPath, commands, timeout = 300000 } = options; // 5 min default

    const steps: DiagnosticStep[] = [];
    const errors: DiagnosticError[] = [];
    const startTime = Date.now();

    for (const command of commands) {
        const step = await runCommand(command, projectPath, timeout);
        steps.push(step);

        // Parse errors from output
        if (!step.success) {
            const parsedErrors = parseErrors(step.stderr + step.stdout, projectPath);
            errors.push(...parsedErrors);
        }

        // Stop if install fails - no point continuing
        if (command === 'install' && !step.success) {
            break;
        }
    }

    const totalDuration = Date.now() - startTime;
    const success = steps.every(s => s.success);

    return {
        steps,
        errors,
        success,
        summary: generateSummary(steps, errors),
        totalDuration,
    };
}

/**
 * Run a single command
 */
async function runCommand(
    command: DiagnosticCommand,
    projectPath: string,
    timeout: number
): Promise<DiagnosticStep> {
    const args = ALLOWED_COMMANDS[command];
    const fullCommand = args.join(' ');
    const startTime = Date.now();

    return new Promise<DiagnosticStep>((resolve) => {
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        let childProcess: ChildProcess | null = null;

        const timeoutId = setTimeout(() => {
            timedOut = true;
            if (childProcess) {
                childProcess.kill('SIGTERM');
                // Force kill after 5 seconds if still running
                setTimeout(() => {
                    if (childProcess && !childProcess.killed) {
                        childProcess.kill('SIGKILL');
                    }
                }, 5000);
            }
        }, timeout);

        try {
            childProcess = spawn(args[0], args.slice(1), {
                cwd: projectPath,
                shell: true,
                env: {
                    ...process.env,
                    // Disable interactive prompts
                    CI: 'true',
                    // Force color output for better error messages
                    FORCE_COLOR: '1',
                },
            });

            childProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
                // Limit output size to prevent memory issues
                if (stdout.length > 1000000) {
                    stdout = stdout.slice(-500000);
                }
            });

            childProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
                if (stderr.length > 1000000) {
                    stderr = stderr.slice(-500000);
                }
            });

            childProcess.on('close', (code) => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;

                resolve({
                    command,
                    fullCommand,
                    exitCode: code,
                    success: code === 0,
                    stdout: truncateOutput(stdout),
                    stderr: truncateOutput(stderr),
                    duration,
                    timedOut,
                });
            });

            childProcess.on('error', (err) => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;

                resolve({
                    command,
                    fullCommand,
                    exitCode: null,
                    success: false,
                    stdout: truncateOutput(stdout),
                    stderr: err.message,
                    duration,
                    timedOut,
                });
            });
        } catch (err) {
            clearTimeout(timeoutId);
            const error = err instanceof Error ? err.message : 'Unknown error';

            resolve({
                command,
                fullCommand,
                exitCode: null,
                success: false,
                stdout: '',
                stderr: error,
                duration: Date.now() - startTime,
                timedOut,
            });
        }
    });
}

/**
 * Truncate output to a reasonable size
 */
function truncateOutput(output: string, maxLength = 50000): string {
    if (output.length <= maxLength) return output;
    return '... (truncated) ...\n' + output.slice(-maxLength);
}

/**
 * Parse errors from command output
 */
function parseErrors(output: string, _projectPath: string): DiagnosticError[] {
    const errors: DiagnosticError[] = [];
    const lines = output.split('\n');

    // Common error patterns
    const patterns = [
        {
            pattern: /Cannot find module ['"]([^'"]+)['"]/,
            type: 'module-not-found',
            getMessage: (match: RegExpMatchArray) => `Module "${match[1]}" not found`,
            getCause: (match: RegExpMatchArray) => `The module "${match[1]}" is imported but not installed or doesn't exist`,
            getFix: (match: RegExpMatchArray) => {
                if (match[1].startsWith('.')) {
                    return `Check if the file "${match[1]}" exists and the path is correct`;
                }
                return `Run "npm install ${match[1]}" to install the missing package`;
            },
        },
        {
            pattern: /Type ['"]([^'"]+)['"] is not assignable to type ['"]([^'"]+)['"]/,
            type: 'type-error',
            getMessage: (match: RegExpMatchArray) => `Type mismatch: "${match[1]}" is not assignable to "${match[2]}"`,
            getCause: () => 'TypeScript type mismatch - the provided type is incompatible with the expected type',
            getFix: () => 'Review the types and ensure they are compatible. You may need to update the type definition or cast the value.',
        },
        {
            pattern: /SyntaxError: (.+)/,
            type: 'syntax-error',
            getMessage: (match: RegExpMatchArray) => `Syntax error: ${match[1]}`,
            getCause: () => 'There is a syntax error in the code that prevents parsing',
            getFix: () => 'Check the file for syntax errors like missing brackets, semicolons, or incorrect keywords.',
        },
        {
            pattern: /error TS(\d+): (.+)/,
            type: 'typescript-error',
            getMessage: (match: RegExpMatchArray) => `TypeScript error TS${match[1]}: ${match[2]}`,
            getCause: (match: RegExpMatchArray) => `TypeScript compilation error (TS${match[1]})`,
            getFix: () => 'Review the TypeScript error message and fix the type issue.',
        },
        {
            pattern: /npm ERR! (.+)/,
            type: 'npm-error',
            getMessage: (match: RegExpMatchArray) => `NPM error: ${match[1]}`,
            getCause: () => 'An error occurred during npm operation',
            getFix: () => 'Check your network connection, try clearing npm cache with "npm cache clean --force", or delete node_modules and reinstall.',
        },
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const { pattern, type, getMessage, getCause, getFix } of patterns) {
            const match = line.match(pattern);
            if (match) {
                // Extract file paths from surrounding context
                const context = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
                const files = extractFilePaths(context);

                errors.push({
                    type,
                    message: getMessage(match),
                    files,
                    probableCause: getCause(match),
                    suggestedFix: getFix(match),
                    confidence: 0.8,
                });
                break;
            }
        }
    }

    // Deduplicate errors by message
    const seen = new Set<string>();
    return errors.filter(error => {
        if (seen.has(error.message)) return false;
        seen.add(error.message);
        return true;
    });
}

/**
 * Generate a human-readable summary
 */
function generateSummary(steps: DiagnosticStep[], errors: DiagnosticError[]): string {
    const lines: string[] = [];

    for (const step of steps) {
        const status = step.success ? '✓' : '✗';
        const timeoutLabel = step.timedOut ? ' (timed out)' : '';
        lines.push(`${status} ${step.command}: ${step.success ? 'Success' : 'Failed'}${timeoutLabel}`);
    }

    if (errors.length > 0) {
        lines.push('', `Found ${errors.length} error(s):`);
        errors.slice(0, 5).forEach((error, i) => {
            lines.push(`  ${i + 1}. ${error.message}`);
            lines.push(`     → ${error.suggestedFix}`);
        });
        if (errors.length > 5) {
            lines.push(`  ... and ${errors.length - 5} more errors`);
        }
    }

    return lines.join('\n');
}

/**
 * Get diagnostic summary as a string
 */
export function getDiagnosticsSummary(result: DiagnosticResult): string {
    return result.summary;
}

/**
 * Check if diagnostics completed successfully
 */
export function isDiagnosticsSuccessful(result: DiagnosticResult): boolean {
    return result.success;
}
