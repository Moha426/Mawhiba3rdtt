const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

// For any mutate function that looks like:
// mutate: (var, opts) => {
//   setter((prev) => prev.map((x) => (x.id === var.id ? { ...x, ...var } : x)));
//   opts?.onSuccess?.();
// }
code = code.replace(/mutate:\s*\(([^,]+),\s*opts\?:\s*any\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.map\(\(([^)]+)\)\s*=>\s*\(\3\.id\s*===\s*\1\.id\s*\?\s*\{\s*\.\.\.\3,\s*\.\.\.\1\s*\}\s*:\s*\3\)\)\);\s*opts\?\.onSuccess\?\.\(\);\s*\}/g,
(match, arg, setter, loopVar) => {
    return `mutate: (${arg}, opts?: any) => {
      const id = ${arg}?.id || ${arg};
      const data = ${arg}?.data || ${arg};
      ${setter}((prev) => prev.map((${loopVar}) => (${loopVar}.id === id ? { ...${loopVar}, ...data } : ${loopVar})));
      opts?.onSuccess?.();
    }`;
});

code = code.replace(/mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.map\(\(([^)]+)\)\s*=>\s*\(\3\.id\s*===\s*\1\.id\s*\?\s*\{\s*\.\.\.\3,\s*\.\.\.\1\s*\}\s*:\s*\3\)\)\)/g,
(match, arg, setter, loopVar) => {
    return `mutateAsync: async (${arg}) => {
      const id = ${arg}?.id || ${arg};
      const data = ${arg}?.data || ${arg};
      return ${setter}((prev) => prev.map((${loopVar}) => (${loopVar}.id === id ? { ...${loopVar}, ...data } : ${loopVar})));
    }`;
});

// Delete hooks:
// mutate: (var, opts) => {
//   setter((prev) => prev.filter((x) => x.id !== var));
//   opts?.onSuccess?.();
// }
code = code.replace(/mutate:\s*\(([^,]+),\s*opts\?:\s*any\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.filter\(\(([^)]+)\)\s*=>\s*\3\.id\s*!==\s*\1\)\);\s*opts\?\.onSuccess\?\.\(\);\s*\}/g,
(match, arg, setter, loopVar) => {
    return `mutate: (${arg}, opts?: any) => {
      const id = typeof ${arg} === 'object' ? ${arg}?.id : ${arg};
      ${setter}((prev) => prev.filter((${loopVar}) => ${loopVar}.id !== id));
      opts?.onSuccess?.();
    }`;
});

code = code.replace(/mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*prev\.filter\(\(([^)]+)\)\s*=>\s*\3\.id\s*!==\s*\1\)\)/g,
(match, arg, setter, loopVar) => {
    return `mutateAsync: async (${arg}) => {
      const id = typeof ${arg} === 'object' ? ${arg}?.id : ${arg};
      return ${setter}((prev) => prev.filter((${loopVar}) => ${loopVar}.id !== id));
    }`;
});

// Create hooks:
// mutate: (var, opts) => {
//   setter((prev) => [{ ...var, id: Date.now() }, ...prev]);
//   opts?.onSuccess?.();
// }
code = code.replace(/mutate:\s*\(([^,]+),\s*opts\?:\s*any\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*\[\s*\{\s*\.\.\.\1,\s*id:\s*Date\.now\(\)\s*\},\s*\.\.\.prev\s*\]\);\s*opts\?\.onSuccess\?\.\(\);\s*\}/g,
(match, arg, setter) => {
    return `mutate: (${arg}, opts?: any) => {
      const data = ${arg}?.data || ${arg};
      ${setter}((prev) => [{ ...data, id: Date.now() }, ...prev]);
      opts?.onSuccess?.();
    }`;
});

code = code.replace(/mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*\[\s*\{\s*\.\.\.\1,\s*id:\s*Date\.now\(\)\s*\},\s*\.\.\.prev\s*\]\)/g,
(match, arg, setter) => {
    return `mutateAsync: async (${arg}) => {
      const data = ${arg}?.data || ${arg};
      return ${setter}((prev) => [{ ...data, id: Date.now() }, ...prev]);
    }`;
});

// What if the create hook appends to the end instead of the beginning?
// [...prev, { ...var, id: Date.now() }]
code = code.replace(/mutate:\s*\(([^,]+),\s*opts\?:\s*any\)\s*=>\s*\{\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*\[\s*\.\.\.prev,\s*\{\s*\.\.\.\1,\s*id:\s*Date\.now\(\)\s*\}\s*\]\);\s*opts\?\.onSuccess\?\.\(\);\s*\}/g,
(match, arg, setter) => {
    return `mutate: (${arg}, opts?: any) => {
      const data = ${arg}?.data || ${arg};
      ${setter}((prev) => [...prev, { ...data, id: Date.now() }]);
      opts?.onSuccess?.();
    }`;
});

code = code.replace(/mutateAsync:\s*async\s*\(([^)]+)\)\s*=>\s*(set[A-Za-z0-9_]+)\(\(prev\)\s*=>\s*\[\s*\.\.\.prev,\s*\{\s*\.\.\.\1,\s*id:\s*Date\.now\(\)\s*\}\s*\]\)/g,
(match, arg, setter) => {
    return `mutateAsync: async (${arg}) => {
      const data = ${arg}?.data || ${arg};
      return ${setter}((prev) => [...prev, { ...data, id: Date.now() }]);
    }`;
});


fs.writeFileSync('src/lib/api-client-react.ts', code);
