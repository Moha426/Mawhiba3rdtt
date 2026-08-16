const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

// For every block that looks like:
// mutate: (arg, opts) => setSomething(prev => ...),
// we rewrite it to:
// mutate: (arg, opts) => { setSomething(prev => ...); opts?.onSuccess?.(); },
code = code.replace(/mutate:\s*\(([^)]+)\)\s*=>\s*(set[a-zA-Z0-9_]+\([^;]+\)),/g, "mutate: ($1) => { $2; opts?.onSuccess?.(); },");

// Fix those missing `opts` parameter
code = code.replace(/mutate:\s*\(([^),]+)\)\s*=>\s*\{/g, "mutate: ($1, opts?: any) => {");

fs.writeFileSync('src/lib/api-client-react.ts', code);
