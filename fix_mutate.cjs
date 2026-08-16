const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

code = code.replace(/\{\s*(set[A-Za-z0-9_]+)\(\(prev:\s*any\);\s*opts\?\.onSuccess\?\.\(\);\s*\}\s*=>\s*/g, "$1((prev: any) => ");

fs.writeFileSync('src/lib/api-client-react.ts', code);
