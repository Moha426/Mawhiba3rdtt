const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

code = code.replace(/mutate:\s*\(([^)]+)\)\s*=>\s*(set[a-zA-Z0-9_]+\([^;]+\)),/g, "mutate: ($1) => { $2; opts?.onSuccess?.(); },");
code = code.replace(/mutate:\s*\(([^),]+)\)\s*=>\s*\{/g, "mutate: ($1, opts?: any) => {");

// Now ensure ALL mutation hooks have `isPending: false`
// Find `export const use[A-Z].* \= \(\) => \{\s*(const \[[^\]]+\] \= [^\n]+;\s*)return \{`
// and inject `isPending: false, `
code = code.replace(/(export const use[a-zA-Z0-9_]+\s*=\s*\(\)\s*=>\s*\{\s*(?:const [^\n]+\n\s*)*return\s*\{)\s*(?!isPending)/g, "$1\n    isPending: false,");

// also fix useGetStudentProfile / useLogout etc if they got broken? No, they don't return `mutate:`. But they might return `{ mutate: ... }`.
fs.writeFileSync('src/lib/api-client-react.ts', code);
