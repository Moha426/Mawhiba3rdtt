const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

// replace `return { \n    mutate:` with `return { \n    isPending: false,\n    mutate:`
code = code.replace(/return\s*\{\s*mutate:/g, "return {\n    isPending: false,\n    mutate:");

// Also, the previous fix left some syntax errors? Wait, the compiler complained about EXPECTED ARGUMENTS:
// Expected 1 arguments, but got 2.
// Expected 0 arguments, but got 1.

// Let's replace `mutate: ([^)]*) =>` with `mutate: ($1, opts?: any) =>` IF it doesn't already have opts.
code = code.replace(/mutate:\s*\(([^,)]+)\)\s*=>/g, "mutate: ($1, opts?: any) =>");
code = code.replace(/mutate:\s*\(\)\s*=>/g, "mutate: (opts?: any) =>");

fs.writeFileSync('src/lib/api-client-react.ts', code);
