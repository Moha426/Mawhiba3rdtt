const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

// For update hooks that receive { id, data }:
code = code.replace(/mutate:\s*\(([^,]+),\s*opts\?:\s*any\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.map\(\(a\)\s*=>\s*\(a\.id\s*===\s*\1\.id\s*\?\s*\{\s*\.\.\.a,\s*\.\.\.\1\s*\}\s*:\s*a\)\)\);\s*opts\?\.onSuccess\?\.\(\);\s*\}/g, 
(match, arg, setter) => {
    return `mutate: (${arg}, opts?: any) => {
      const id = ${arg}?.id || ${arg};
      const data = ${arg}?.data || ${arg};
      ${setter}((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
      opts?.onSuccess?.();
    }`;
});

code = code.replace(/mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.map\(\(a\)\s*=>\s*\(a\.id\s*===\s*\1\.id\s*\?\s*\{\s*\.\.\.a,\s*\.\.\.\1\s*\}\s*:\s*a\)\)\)/g, 
(match, arg, setter) => {
    return `mutateAsync: async (${arg}) => {
      const id = ${arg}?.id || ${arg};
      const data = ${arg}?.data || ${arg};
      return ${setter}((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    }`;
});

// For create hooks that receive { data } or just item:
code = code.replace(/mutate:\s*\(([^,]+),\s*opts\?:\s*any\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*\[\{\s*\.\.\.\1,\s*id:\s*Date\.now\(\)\s*\},\s*\.\.\.prev\]\);\s*opts\?\.onSuccess\?\.\(\);\s*\}/g,
(match, arg, setter) => {
    return `mutate: (${arg}, opts?: any) => {
      const data = ${arg}?.data || ${arg};
      ${setter}((prev) => [{ ...data, id: Date.now() }, ...prev]);
      opts?.onSuccess?.();
    }`;
});

code = code.replace(/mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*\[\{\s*\.\.\.\1,\s*id:\s*Date\.now\(\)\s*\},\s*\.\.\.prev\]\)/g,
(match, arg, setter) => {
    return `mutateAsync: async (${arg}) => {
      const data = ${arg}?.data || ${arg};
      return ${setter}((prev) => [{ ...data, id: Date.now() }, ...prev]);
    }`;
});


fs.writeFileSync('src/lib/api-client-react.ts', code);
