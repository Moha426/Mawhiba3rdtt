const fs = require('fs');
let content = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

content = content.replace(
  'export interface Assignment {',
  'export interface Assignment {\n  externalUrl?: string;'
);

content = content.replace(
  'export interface Quiz {',
  'export interface Quiz {\n  externalUrl?: string;'
);

fs.writeFileSync('src/lib/api-client-react.ts', content, 'utf8');
