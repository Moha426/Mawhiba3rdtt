const fs = require('fs');
let content = fs.readFileSync('src/pages/platforms.tsx', 'utf8');

// Update filtering logic to use categories
content = content.replace(
  'const matchCat = selectedCategory === "الكل" || p.category === selectedCategory;',
  'const matchCat = selectedCategory === "الكل" || p.category === selectedCategory || (p.categories && p.categories.includes(selectedCategory));'
);

// Update _blank to handle openInNewTab
// Find all target="_blank" and replace them carefully
content = content.replace(/target="_blank"/g, 'target={item.openInNewTab === false ? "_self" : "_blank"}');

// What if the anchor doesn't have an `item` variable available? Let's check context.
// Lines 714, 1122, 1222.
