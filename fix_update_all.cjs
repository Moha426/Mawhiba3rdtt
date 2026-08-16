const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

code = code.replace(/mutate:\s*\(([^,]+),\s*opts\?:\s*any\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.map\(\([A-Za-z0-9_]+\)\s*=>\s*\([A-Za-z0-9_]+\.id\s*===\s*\1\.id\s*\?\s*\{\s*\.\.\.[A-Za-z0-9_]+,\s*\.\.\.\1\s*\}\s*:\s*[A-Za-z0-9_]+\)\)\);\s*opts\?\.onSuccess\?\.\(\);\s*\}/g, 
(match, arg, setter) => {
    return `mutate: (${arg}, opts?: any) => {
      const id = ${arg}?.id || ${arg};
      const data = ${arg}?.data || ${arg};
      ${setter}((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
      opts?.onSuccess?.();
    }`;
});

code = code.replace(/mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.map\(\([A-Za-z0-9_]+\)\s*=>\s*\([A-Za-z0-9_]+\.id\s*===\s*\1\.id\s*\?\s*\{\s*\.\.\.[A-Za-z0-9_]+,\s*\.\.\.\1\s*\}\s*:\s*[A-Za-z0-9_]+\)\)\)/g, 
(match, arg, setter) => {
    return `mutateAsync: async (${arg}) => {
      const id = ${arg}?.id || ${arg};
      const data = ${arg}?.data || ${arg};
      return ${setter}((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    }`;
});

fs.writeFileSync('src/lib/api-client-react.ts', code);
