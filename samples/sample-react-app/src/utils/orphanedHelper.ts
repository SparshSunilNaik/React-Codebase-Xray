// Orphaned utility - not imported anywhere
export function unusedHelper() {
    return 'I am not used anywhere!';
}

export function anotherUnusedFunction(x: any) {
    // Using 'any' type - will trigger TypeScript lint warning
    console.log('This console.log will trigger a lint warning');
    return x * 2;
}
