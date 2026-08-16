const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

code = code.replace(/mutate:\s*\(\s*opts\?:\s*any,\s*opts\?:\s*any\s*\)/g, "mutate: (opts?: any)");

fs.writeFileSync('src/lib/api-client-react.ts', code);
