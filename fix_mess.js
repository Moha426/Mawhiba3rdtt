const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

// The breakage is:
// mutate: (ARG, opts?: any) => { SETTER,
// mutateAsync: async (ARG2) => SETTER2; opts?.onSuccess?.(); },
// Let's replace it:
code = code.replace(/mutate:\s*\(([^)]+)\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+\([^,;]+\)(?:\([^;]+\))?),\n\s*mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+\([^;]+\));\s*opts\?\.onSuccess\?\.\(\);\s*\}/g,
(match, arg, setter1, arg2, setter2) => {
    return `mutate: (${arg}) => {\n      ${setter1};\n      opts?.onSuccess?.();\n    },\n    mutateAsync: async (${arg2}) => ${setter2}`;
});

code = code.replace(/isPending:\s*false,\s*isPending:\s*false,/g, "isPending: false,");

fs.writeFileSync('src/lib/api-client-react.ts', code);
