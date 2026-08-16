const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

const regex = /export const (use[A-Za-z0-9_]+) = \(\) => \{\s*const \[, (set[A-Za-z0-9_]+)\] = usePersistentState/;
console.log(code.match(regex)?.length > 0 ? "Matched" : "No match");
