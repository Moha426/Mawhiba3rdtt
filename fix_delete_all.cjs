const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

code = code.replace(/mutate:\s*\(([^,]+),\s*opts\?:\s*any\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.filter\(\([A-Za-z0-9_]+\)\s*=>\s*[A-Za-z0-9_]+\.id\s*!==\s*\1\)\);\s*opts\?\.onSuccess\?\.\(\);\s*\}/g,
(match, arg, setter) => {
    return `mutate: (${arg}, opts?: any) => {
      const id = typeof ${arg} === 'object' ? ${arg}?.id : ${arg};
      ${setter}((prev) => prev.filter((a) => a.id !== id));
      opts?.onSuccess?.();
    }`;
});

code = code.replace(/mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.filter\(\([A-Za-z0-9_]+\)\s*=>\s*[A-Za-z0-9_]+\.id\s*!==\s*\1\)\)/g,
(match, arg, setter) => {
    return `mutateAsync: async (${arg}) => {
      const id = typeof ${arg} === 'object' ? ${arg}?.id : ${arg};
      return ${setter}((prev) => prev.filter((a) => a.id !== id));
    }`;
});

fs.writeFileSync('src/lib/api-client-react.ts', code);
