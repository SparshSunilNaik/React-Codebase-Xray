/**
 * Analysis API Routes
 * Endpoints for analyzing React codebases
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import {
    analyze,
    runDiagnostics,
    generateJsonReport,
    generateMarkdownReport,
} from '@react-codebase-xray/analyzer';
import type {
    AnalyzeRequest,
    AnalyzeResponse,
    DiagnosticsRequest,
    DiagnosticsResponse,
} from '@react-codebase-xray/shared';

const router = Router();

// Configure multer for ZIP file uploads
const upload = multer({
    dest: path.join(os.tmpdir(), 'react-xray-uploads'),
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'));
        }
    },
});

/**
 * POST /api/analyze
 * Analyze a local folder or previously uploaded ZIP
 */
router.post('/analyze', async (req: Request, res: Response) => {
    try {
        const body = req.body as AnalyzeRequest;

        if (!body.path) {
            return res.status(400).json({
                success: false,
                error: 'Path is required',
            } as AnalyzeResponse);
        }

        // Security check: ensure path doesn't contain path traversal
        const normalizedPath = path.normalize(body.path);
        if (normalizedPath.includes('..')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid path: path traversal detected',
            } as AnalyzeResponse);
        }

        console.log(`Starting analysis of: ${body.path}`);

        const result = await analyze({
            path: body.path,
            isZip: body.isZip,
            config: body.config,
        });

        console.log(`Analysis complete: ${result.success ? 'success' : 'failed'}`);

        res.json({
            success: true,
            result,
        } as AnalyzeResponse);
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
        } as AnalyzeResponse);
    }
});

/**
 * POST /api/upload-zip
 * Upload and extract a ZIP file for analysis
 */
router.post('/upload-zip', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }

        const zipPath = req.file.path;
        console.log(`ZIP uploaded: ${zipPath}`);

        // Analyze the ZIP file
        const result = await analyze({
            path: zipPath,
            isZip: true,
        });

        // Clean up uploaded file
        try {
            await fs.unlink(zipPath);
        } catch {
            // Ignore cleanup errors
        }

        res.json({
            success: true,
            result,
        } as AnalyzeResponse);
    } catch (error) {
        console.error('Upload analysis error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
        } as AnalyzeResponse);
    }
});

/**
 * POST /api/diagnostics
 * Run diagnostics on a project (opt-in, requires explicit confirmation)
 */
router.post('/diagnostics', async (req: Request, res: Response) => {
    try {
        const body = req.body as DiagnosticsRequest & { confirmed?: boolean };

        // Require explicit confirmation
        if (!body.confirmed) {
            return res.status(400).json({
                success: false,
                error: 'Diagnostics mode requires explicit confirmation. Set "confirmed: true" in the request body.',
                warning: 'Diagnostics mode will run npm install, npm run build, and npm test. These commands execute code on your machine.',
            } as DiagnosticsResponse);
        }

        if (!body.projectPath) {
            return res.status(400).json({
                success: false,
                error: 'Project path is required',
            } as DiagnosticsResponse);
        }

        console.log(`Starting diagnostics for: ${body.projectPath}`);
        console.log('⚠️  Running npm commands - this may take a while...');

        const result = await runDiagnostics({
            projectPath: body.projectPath,
            commands: body.commands || ['install', 'build', 'test'],
            timeout: body.timeout || 300000,
        });

        console.log(`Diagnostics complete: ${result.success ? 'success' : 'failed'}`);

        res.json({
            success: true,
            result,
        } as DiagnosticsResponse);
    } catch (error) {
        console.error('Diagnostics error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Diagnostics failed',
        } as DiagnosticsResponse);
    }
});

/**
 * POST /api/report
 * Generate a downloadable report from analysis results
 */
router.post('/report', async (req: Request, res: Response) => {
    try {
        const { result, format = 'json' } = req.body;

        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'Analysis result is required',
            });
        }

        let content: string;
        let contentType: string;
        let filename: string;

        if (format === 'markdown' || format === 'md') {
            content = generateMarkdownReport(result);
            contentType = 'text/markdown';
            filename = `xray-report-${Date.now()}.md`;
        } else {
            content = generateJsonReport(result);
            contentType = 'application/json';
            filename = `xray-report-${Date.now()}.json`;
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Report generation failed',
        });
    }
});

export { router as analysisRouter };
