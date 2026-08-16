const fs = require('fs');
const content = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');
const patched = content.replace(
  `const val = (Array.isArray(data.value) && data.value.length === 0 && Array.isArray(initialValue) && initialValue.length > 0)\n                ? initialValue\n                : data.value;`,
  `const val = data.value;`
);
fs.writeFileSync('src/lib/api-client-react.ts', patched);
