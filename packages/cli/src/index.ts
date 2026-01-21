#!/usr/bin/env node

/**
 * React Codebase X-Ray CLI
 * Command-line interface for analyzing React codebases
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import {
    analyze,
    generateJsonReport,
    generateMarkdownReport,
} from '@react-codebase-xray/analyzer';
import { formatDuration } from '@react-codebase-xray/shared';

const VERSION = '1.0.0';

const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.bold.white('🔍 React Codebase X-Ray')}                                 ${chalk.cyan('║')}
${chalk.cyan('║')}   ${chalk.gray('Local React Codebase Analyzer')}                          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;

program
    .name('react-codebase-xray')
    .description('Analyze React codebases locally')
    .version(VERSION);

program
    .command('analyze')
    .description('Analyze a React codebase')
    .argument('<path>', 'Path to project folder or ZIP file')
    .option('-o, --output <file>', 'Output file path for the report')
    .option('-f, --format <format>', 'Report format: json or markdown', 'json')
    .option('--no-lint', 'Skip lint analysis')
    .option('--no-deps', 'Skip dependency analysis')
    .option('--diagnostics', 'Run diagnostics (npm install, build, test)')
    .option('--timeout <ms>', 'Timeout for diagnostic commands', '300000')
    .action(async (projectPath: string, options) => {
        console.log(banner);

        const absolutePath = path.resolve(projectPath);
        const isZip = projectPath.toLowerCase().endsWith('.zip');

        console.log(chalk.gray(`Analyzing: ${absolutePath}`));
        console.log();

        const spinner = ora('Starting analysis...').start();

        try {
            // Check if path exists
            try {
                await fs.access(absolutePath);
            } catch {
                spinner.fail(chalk.red(`Path not found: ${absolutePath}`));
                process.exit(1);
            }

            // Run analysis
            spinner.text = 'Reading project structure...';

            const startTime = Date.now();

            const result = await analyze({
                path: absolutePath,
                isZip,
                config: {
                    runDiagnostics: options.diagnostics || false,
                    diagnosticTimeout: parseInt(options.timeout, 10),
                },
            });

            const duration = Date.now() - startTime;

            if (!result.success) {
                spinner.fail(chalk.red(`Analysis failed: ${result.errorMessage}`));
                process.exit(1);
            }

            spinner.succeed(chalk.green(`Analysis complete in ${formatDuration(duration)}`));
            console.log();

            // Print summary
            console.log(chalk.bold('📊 Summary'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(`  Project:     ${chalk.cyan(result.overview.name)}`);
            console.log(`  Framework:   ${chalk.yellow(result.overview.framework.name)}`);
            console.log(`  Files:       ${result.overview.fileStats.totalFiles.toLocaleString()}`);
            console.log(`  Lines:       ${result.overview.fileStats.totalLinesOfCode.toLocaleString()}`);
            console.log(`  Modules:     ${result.dependencyGraph.totalModules}`);
            console.log(`  Routes:      ${result.routes.totalRoutes}`);
            console.log();

            // Print issues
            const circularCount = result.dependencyGraph.circularDependencies.length;
            const errorCount = result.lint.bySeverity.error;
            const warningCount = result.lint.bySeverity.warning;
            const unusedCount = result.dependencies.unused.length;

            console.log(chalk.bold('🔍 Issues'));
            console.log(chalk.gray('─'.repeat(50)));

            if (circularCount > 0) {
                console.log(`  ${chalk.yellow('⚠')}  Circular Dependencies: ${chalk.yellow(circularCount)}`);
            }
            if (errorCount > 0) {
                console.log(`  ${chalk.red('✗')}  Lint Errors: ${chalk.red(errorCount)}`);
            }
            if (warningCount > 0) {
                console.log(`  ${chalk.yellow('⚠')}  Lint Warnings: ${chalk.yellow(warningCount)}`);
            }
            if (unusedCount > 0) {
                console.log(`  ${chalk.blue('ℹ')}  Unused Dependencies: ${chalk.blue(unusedCount)}`);
            }
            if (circularCount === 0 && errorCount === 0 && warningCount === 0 && unusedCount === 0) {
                console.log(`  ${chalk.green('✓')}  No issues found!`);
            }
            console.log();

            // Print circular dependencies
            if (circularCount > 0) {
                console.log(chalk.bold('🔄 Circular Dependencies'));
                console.log(chalk.gray('─'.repeat(50)));
                result.dependencyGraph.circularDependencies.slice(0, 5).forEach(cd => {
                    console.log(`  ${chalk.yellow('→')} ${cd.chain.join(' → ')}`);
                });
                if (circularCount > 5) {
                    console.log(chalk.gray(`  ... and ${circularCount - 5} more`));
                }
                console.log();
            }

            // Print diagnostics results
            if (result.diagnostics) {
                console.log(chalk.bold('🔧 Diagnostics'));
                console.log(chalk.gray('─'.repeat(50)));
                result.diagnostics.steps.forEach(step => {
                    const icon = step.success ? chalk.green('✓') : chalk.red('✗');
                    console.log(`  ${icon} ${step.fullCommand} (${formatDuration(step.duration)})`);
                });
                console.log();
            }

            // Generate report
            if (options.output) {
                const format = options.format.toLowerCase();
                const reportPath = path.resolve(options.output);

                let content: string;
                if (format === 'markdown' || format === 'md') {
                    content = generateMarkdownReport(result);
                } else {
                    content = generateJsonReport(result);
                }

                await fs.writeFile(reportPath, content, 'utf-8');
                console.log(chalk.green(`📝 Report saved to: ${reportPath}`));
            } else {
                console.log(chalk.gray('Tip: Use --output <file> to save the report'));
            }

            // Exit with appropriate code
            process.exit(errorCount > 0 ? 1 : 0);

        } catch (error) {
            spinner.fail(chalk.red('Analysis failed'));
            console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
            process.exit(1);
        }
    });

program
    .command('report')
    .description('Generate a report from a previous analysis')
    .argument('<json-file>', 'Path to analysis result JSON file')
    .option('-o, --output <file>', 'Output file path', 'report.md')
    .option('-f, --format <format>', 'Report format: json or markdown', 'markdown')
    .action(async (jsonFile: string, options) => {
        console.log(banner);

        const inputPath = path.resolve(jsonFile);
        const outputPath = path.resolve(options.output);

        try {
            const content = await fs.readFile(inputPath, 'utf-8');
            const result = JSON.parse(content);

            let report: string;
            if (options.format === 'json') {
                report = generateJsonReport(result);
            } else {
                report = generateMarkdownReport(result);
            }

            await fs.writeFile(outputPath, report, 'utf-8');
            console.log(chalk.green(`📝 Report saved to: ${outputPath}`));

        } catch (error) {
            console.error(chalk.red('Failed to generate report'));
            console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
            process.exit(1);
        }
    });

program.parse();
