const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

// The typical pattern is: mutate: (item: any) => setAssignments(...)
code = code.replace(/mutate:\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+\([^)]+\)(?:\([^)]+\))?)/g, 
  (match, p1, p2) => {
    return `mutate: (${p1}, opts?: any) => { ${p2}; opts?.onSuccess?.(); }`;
  });

fs.writeFileSync('src/lib/api-client-react.ts', code);
