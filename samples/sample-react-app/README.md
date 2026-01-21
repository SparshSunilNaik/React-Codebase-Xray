# Sample React App

This is a sample React application used for testing react-codebase-xray.

## Features Tested

- **React Router routes**: Detected in `App.tsx`
- **Circular dependencies**: `circularA.ts` ↔ `circularB.ts`
- **Custom hooks**: `useCounter.ts`
- **Unused dependencies**: `unused-package` in package.json
- **Orphaned modules**: `orphanedHelper.ts` has no dependents
- **Lint issues**: Missing deps in useEffect, any type usage, console.log

## Usage

This fixture can be used to test react-codebase-xray:

```bash
# From the root of react-codebase-xray
npm run dev

# Then analyze this fixture at:
# d:\React Debugger\react-codebase-xray\fixtures\sample-react-app
```
