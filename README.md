# React Codebase X-Ray 🔍

> A fully local, open-source developer tool for analyzing React codebases.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![100% Local](https://img.shields.io/badge/100%25-Local-green.svg)](.)
[![No Cloud](https://img.shields.io/badge/Cloud-None-blue.svg)](.)

## Why React Codebase X-Ray?

Understanding a React codebase—especially a large one—can be overwhelming. React Codebase X-Ray provides instant insights into:

- 📊 **Project Structure** - File statistics, largest files, tech stack detection
- 🔗 **Dependency Graph** - Visualize module dependencies with interactive graphs
- 🔄 **Circular Dependencies** - Detect and highlight problematic import cycles
- 🛣️ **Route Map** - Detect Next.js (App/Pages Router) and React Router routes
- 📦 **Unused Dependencies** - Find packages in package.json that aren't used
- ⚠️ **Lint Issues** - React-specific issues with explanations and fixes
- 🔧 **Diagnostics** - Opt-in build/test execution with error analysis

**All analysis runs 100% locally on your machine.** No data is uploaded anywhere.

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/react-codebase-xray.git
cd react-codebase-xray

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will open at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Using the Web UI

1. Open http://localhost:5173 in your browser
2. Enter the **absolute path** to a React project folder, or upload a ZIP file
3. Click **Analyze**
4. Explore the results through the interactive dashboard

### Using the CLI

```bash
# Build the CLI
npm run build -w packages/cli

# Analyze a project
npx react-codebase-xray analyze ./path/to/react-project

# Save report to file
npx react-codebase-xray analyze ./my-project --output report.json
npx react-codebase-xray analyze ./my-project --output report.md --format markdown

# Run with diagnostics (npm install, build, test)
npx react-codebase-xray analyze ./my-project --diagnostics
```

---

## Features

### 📊 Project Overview

Get instant insights into your codebase:
- Total files, lines of code, directories
- Framework detection (Next.js, Vite, CRA, Remix, Gatsby)
- Tech stack badges (TypeScript, Tailwind, ESLint, etc.)
- File type distribution
- Largest files in the codebase

### 🔗 Dependency Graph

Interactive visualization powered by React Flow:
- Zoomable and pannable graph
- Color-coded by module type (component, hook, util, page, etc.)
- Circular dependencies highlighted in yellow
- Click nodes for detailed information
- Filter to show only circular dependencies

### 🛣️ Route Detection

Automatically detects routes for:
- **Next.js App Router** - Scans `app/` for `page.tsx` and `route.tsx`
- **Next.js Pages Router** - Scans `pages/` directory
- **React Router** - Parses `<Route>` components and `createBrowserRouter`

Features:
- Dynamic route detection (`:id`, `[slug]`)
- API route identification
- HTTP method detection for API routes

### 📦 Dependency Analysis

Powered by `depcheck`:
- Find unused dependencies
- Find missing dependencies
- Quick uninstall/install commands

### ⚠️ Lint Analysis

Programmatic ESLint analysis with React-focused rules:
- React Hooks violations
- Performance anti-patterns
- Accessibility issues
- TypeScript issues
- Human-readable explanations for each issue

### 🔧 Diagnostics Mode

**⚠️ Opt-in only with explicit confirmation**

Runs sandboxed npm commands:
- `npm install --legacy-peer-deps`
- `npm run build`
- `npm test -- --passWithNoTests`

Features:
- 5-minute timeout per command
- Error parsing with probable causes
- Suggested fixes for common issues

---

## Project Structure

```
react-codebase-xray/
├── apps/
│   └── web/                    # Vite + React frontend + Express backend
│       ├── src/                # React components
│       │   ├── components/     # UI components
│       │   ├── App.tsx         # Main application
│       │   └── index.css       # Tailwind styles
│       └── server/             # Express API server
│           ├── index.ts        # Server entry
│           └── routes/         # API routes
├── packages/
│   ├── analyzer/               # Core analysis engine
│   │   ├── dependencyGraph.ts  # madge integration
│   │   ├── routeDetector.ts    # Route detection
│   │   ├── lintAnalyzer.ts     # ESLint integration
│   │   ├── unusedDeps.ts       # depcheck integration
│   │   ├── diagnostics.ts      # Sandboxed npm runner
│   │   ├── projectOverview.ts  # Metadata extraction
│   │   └── reportBuilder.ts    # JSON/Markdown reports
│   ├── cli/                    # Command-line interface
│   │   └── src/index.ts        # CLI commands
│   └── shared/                 # Shared types and utilities
│       ├── types.ts            # TypeScript interfaces
│       └── utils.ts            # Common utilities
└── README.md
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Graph Visualization | React Flow |
| Backend | Express.js, TypeScript |
| Dependency Analysis | madge, depcheck |
| Lint Analysis | ESLint (programmatic) |
| CLI | Commander.js, Chalk, Ora |

---

## Security Notes

### 🔒 Local-First Design

- **No cloud services** - Everything runs on your machine
- **No external API calls** - No data is uploaded anywhere
- **No accounts required** - No registration or login
- **No telemetry** - We don't track anything

### ⚠️ Diagnostics Mode

Diagnostics mode is **disabled by default** and requires:
1. Explicit checkbox confirmation in the UI
2. `confirmed: true` in the API request
3. `--diagnostics` flag in CLI

**Only whitelisted commands are allowed:**
- `npm install --legacy-peer-deps`
- `npm run build`
- `npm test -- --passWithNoTests`

All commands have a 5-minute timeout to prevent runaway processes.

### 🛡️ Path Validation

- Path traversal attacks are blocked
- Only absolute paths within the project are allowed
- ZIP extraction is isolated to temporary directories

---

## Limitations

- **Large codebases**: Projects with >10,000 files may be slow to analyze
- **Route detection**: Non-standard routing patterns may not be detected
- **Monorepos**: Complex workspace configurations may have partial support
- **ESLint config**: Projects with custom ESLint plugins may have issues
- **Node.js only**: This is not a browser extension; it requires Node.js

---

## Troubleshooting

### "Cannot find module" errors

```bash
# Clean and reinstall
rm -rf node_modules packages/*/node_modules apps/*/node_modules
npm install
```

### Analysis is slow

- Large `node_modules` folders are automatically excluded
- Try analyzing a smaller subset first
- Increase timeout for diagnostics: `--timeout 600000`

### ESLint errors in lint analysis

The analyzer uses a fallback ESLint config if your project doesn't have one. Some custom rules may not be recognized.

### ZIP extraction fails

- Ensure the ZIP file isn't corrupted
- Maximum file size is 500MB
- ZIP must contain a valid React project (with package.json)

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run the dev server to test: `npm run dev`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development

```bash
# Install dependencies
npm install

# Start development (frontend + backend)
npm run dev

# Build all packages
npm run build

# Run tests
npm test
```

---

## Roadmap

- [ ] **Monorepo support** - Better handling of Nx, Turborepo, Lerna workspaces
- [ ] **Bundle analysis** - Integration with webpack-bundle-analyzer
- [ ] **Performance profiling** - React DevTools-like insights
- [ ] **Git history** - Code churn, hotspots, contributor analysis
- [ ] **VS Code extension** - Analyze directly from your editor
- [ ] **Docker support** - Optional containerized deployment
- [ ] **Custom rule plugins** - Extend analysis with your own rules

---

## Verified On

**Verification Date:** January 21, 2026

| Test | Status |
|------|--------|
| **Analyzer Unit Tests** | ✅ Pass |
| Circular dependency detection (circularA ↔ circularB) | ✅ Pass |
| Orphaned module detection (orphanedHelper.ts) | ✅ Pass |
| Unused package detection (unused-package) | ✅ Pass |
| Lint issues with file/line numbers | ✅ Pass |
| **Route Detection** | ✅ Pass |
| Next.js App Router detection | ✅ Pass |
| Dynamic route detection | ✅ Pass |
| API route detection | ✅ Pass |
| **CLI** | ✅ Pass |
| JSON report generation | ✅ Pass |
| Markdown report generation | ✅ Pass |
| **Web UI** | ✅ Pass |
| Dependency graph renders | ✅ Pass |
| Circular deps highlighted (yellow/orange) | ✅ Pass |
| Route map renders | ✅ Pass |
| Issues panel with severity ordering | ✅ Pass |
| **Diagnostics Safety** | ✅ Pass |
| Requires explicit opt-in (confirmed: true) | ✅ Pass |
| Only whitelisted commands execute | ✅ Pass |
| **Cross-Platform** | ✅ Pass |
| Windows paths (primary target) | ✅ Pass |
| path.join/path.resolve used throughout | ✅ Pass |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

This tool is built on top of excellent open-source projects:

- [madge](https://github.com/pahen/madge) - Module dependency graph
- [depcheck](https://github.com/depcheck/depcheck) - Unused dependency detection
- [ESLint](https://eslint.org/) - Linting engine
- [React Flow](https://reactflow.dev/) - Graph visualization
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

<p align="center">
  <b>Built with ❤️ for the React community</b>
  <br>
  <i>100% Local • Open Source • Privacy First</i>
</p>
