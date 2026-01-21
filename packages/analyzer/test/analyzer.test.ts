/**
 * Analyzer Unit Test
 * Tests the analyzer against fixtures/sample-react-app
 */

import { analyze } from '@react-codebase-xray/analyzer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '../../../fixtures');

async function testSampleReactApp() {
    console.log('='.repeat(60));
    console.log('Testing: fixtures/sample-react-app');
    console.log('='.repeat(60));

    const projectPath = path.join(fixturesDir, 'sample-react-app');
    console.log(`Project path: ${projectPath}\n`);

    try {
        const result = await analyze({ path: projectPath });

        console.log('Analysis completed:', result.success ? 'SUCCESS' : 'FAILED');
        console.log(`Duration: ${result.duration}ms\n`);

        // 1. Check circular dependencies
        console.log('--- Circular Dependencies ---');
        console.log(`Found: ${result.dependencyGraph.circularDependencies.length}`);

        const hasCircularAB = result.dependencyGraph.circularDependencies.some(cd => {
            const chain = cd.chain.join(' -> ');
            return chain.includes('circularA') && chain.includes('circularB');
        });
        console.log(`circularA ↔ circularB detected: ${hasCircularAB ? '✓ PASS' : '✗ FAIL'}`);

        result.dependencyGraph.circularDependencies.forEach(cd => {
            console.log(`  Chain: ${cd.chain.join(' → ')}`);
        });
        console.log();

        // 2. Check orphaned modules
        console.log('--- Orphaned Modules ---');
        console.log(`Found: ${result.dependencyGraph.orphanedModules.length}`);

        const hasOrphanedHelper = result.dependencyGraph.orphanedModules.some(
            m => m.includes('orphanedHelper')
        );
        console.log(`orphanedHelper.ts detected: ${hasOrphanedHelper ? '✓ PASS' : '✗ FAIL'}`);

        result.dependencyGraph.orphanedModules.forEach(m => {
            console.log(`  - ${m}`);
        });
        console.log();

        // 3. Check unused dependencies
        console.log('--- Unused Dependencies ---');
        console.log(`Found: ${result.dependencies.unused.length}`);

        const hasUnusedPackage = result.dependencies.unused.some(
            d => d.name === 'unused-package'
        );
        console.log(`unused-package detected: ${hasUnusedPackage ? '✓ PASS' : '✗ FAIL'}`);

        result.dependencies.unused.forEach(d => {
            console.log(`  - ${d.name} (${d.version})`);
        });
        console.log();

        // 4. Check lint issues
        console.log('--- Lint Issues ---');
        console.log(`Total issues: ${result.lint.issues.length}`);
        console.log(`Errors: ${result.lint.bySeverity.error}`);
        console.log(`Warnings: ${result.lint.bySeverity.warning}`);

        const hasLineNumbers = result.lint.issues.every(
            i => typeof i.line === 'number' && typeof i.column === 'number'
        );
        console.log(`All issues have line numbers: ${hasLineNumbers ? '✓ PASS' : '✗ FAIL'}`);

        result.lint.issues.slice(0, 5).forEach(issue => {
            console.log(`  - ${issue.filePath}:${issue.line}:${issue.column}`);
            console.log(`    ${issue.severity}: ${issue.ruleId} - ${issue.message}`);
        });
        if (result.lint.issues.length > 5) {
            console.log(`  ... and ${result.lint.issues.length - 5} more`);
        }
        console.log();

        // 5. Check routes
        console.log('--- Routes ---');
        console.log(`Router type: ${result.routes.routerType}`);
        console.log(`Total routes: ${result.routes.totalRoutes}`);

        result.routes.routes.forEach(r => {
            console.log(`  ${r.path} (${r.type})`);
        });
        console.log();

        // 6. Verify JSON structure matches types
        console.log('--- Structure Verification ---');
        const hasRequiredFields =
            'config' in result &&
            'overview' in result &&
            'dependencyGraph' in result &&
            'routes' in result &&
            'lint' in result &&
            'dependencies' in result &&
            'success' in result &&
            'duration' in result;
        console.log(`Required fields present: ${hasRequiredFields ? '✓ PASS' : '✗ FAIL'}`);

        // Output full result for inspection
        console.log('\n--- Full Result JSON ---');
        console.log(JSON.stringify(result, null, 2).slice(0, 2000) + '\n...(truncated)');

        return result;
    } catch (error) {
        console.error('Analysis failed:', error);
        throw error;
    }
}

async function testSampleNextjsApp() {
    console.log('\n' + '='.repeat(60));
    console.log('Testing: fixtures/sample-nextjs-app');
    console.log('='.repeat(60));

    const projectPath = path.join(fixturesDir, 'sample-nextjs-app');
    console.log(`Project path: ${projectPath}\n`);

    try {
        const result = await analyze({ path: projectPath });

        console.log('Analysis completed:', result.success ? 'SUCCESS' : 'FAILED');
        console.log(`Duration: ${result.duration}ms\n`);

        // Check routes
        console.log('--- Routes ---');
        console.log(`Router type: ${result.routes.routerType}`);
        console.log(`Total routes: ${result.routes.totalRoutes}`);
        console.log(`API routes: ${result.routes.apiRoutes}`);
        console.log(`Dynamic routes: ${result.routes.dynamicRoutes}`);

        const hasAppRouter = result.routes.routerType === 'nextjs-app';
        console.log(`App Router detected: ${hasAppRouter ? '✓ PASS' : '✗ FAIL'}`);

        const hasDynamicRoutes = result.routes.routes.some(r => r.type === 'dynamic');
        console.log(`Dynamic routes detected: ${hasDynamicRoutes ? '✓ PASS' : '✗ FAIL'}`);

        const hasApiRoutes = result.routes.routes.some(r => r.isApi);
        console.log(`API routes detected: ${hasApiRoutes ? '✓ PASS' : '✗ FAIL'}`);

        result.routes.routes.forEach(r => {
            const flags = [];
            if (r.isApi) flags.push('API');
            if (r.type === 'dynamic') flags.push('dynamic');
            if (r.methods?.length) flags.push(r.methods.join(','));
            console.log(`  ${r.path} ${flags.length ? `[${flags.join(', ')}]` : ''}`);
        });
        console.log();

        return result;
    } catch (error) {
        console.error('Analysis failed:', error);
        throw error;
    }
}

// Run tests
console.log('React Codebase X-Ray - Analyzer Unit Tests\n');

testSampleReactApp()
    .then(() => testSampleNextjsApp())
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log('All tests completed!');
        console.log('='.repeat(60));
    })
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
