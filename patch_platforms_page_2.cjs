const fs = require('fs');
let content = fs.readFileSync('src/pages/platforms.tsx', 'utf8');

// The replacement didn't work because we need /target="_blank"/g ? No, it was target="_blank".
content = content.replace(/target="_blank"/g, 'target={item.openInNewTab === false ? "_self" : "_blank"}');

fs.writeFileSync('src/pages/platforms.tsx', content, 'utf8');
