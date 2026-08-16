const fs = require('fs');
let content = fs.readFileSync('src/pages/platforms.tsx', 'utf8');

// State
content = content.replace(
  'const [browserInput, setBrowserInput] = useState("");',
  'const [browserInput, setBrowserInput] = useState("");\n  const [searchType, setSearchType] = useState("عام");'
);

// Submit logic
content = content.replace(
  'targetUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(trimmed)}`;',
  `let q = trimmed;
      if (searchType === "فيديوهات تعليمية") {
        targetUrl = \`https://www.youtube.com/results?search_query=\${encodeURIComponent(q + " تعليمي OR قدرات")}\`;
      } else if (searchType === "أسئلة قدرات ومناهج") {
        targetUrl = \`https://www.google.com/search?igu=1&q=\${encodeURIComponent(q + ' ("قدرات" OR "تحصيلي" OR "أسئلة" OR "اختبار")')}\`;
      } else {
        targetUrl = \`https://www.google.com/search?igu=1&q=\${encodeURIComponent(q)}\`;
      }`
);

// UI logic
// Find the input wrapper: `<div className="relative flex items-center">`
// Add a select next to it.
content = content.replace(
  /<form onSubmit={handleBrowserSubmit} className="relative mt-4 w-full max-w-lg">/,
  `<form onSubmit={handleBrowserSubmit} className="relative mt-4 w-full max-w-2xl flex flex-col sm:flex-row gap-2">`
);

content = content.replace(
  /<div className="relative flex items-center">/g,
  `<div className="relative flex items-center flex-1">`
);

content = content.replace(
  /<\/button>\s*<\/div>\s*<\/form>/,
  `</button>
                </div>
                <select 
                  value={searchType} 
                  onChange={e => setSearchType(e.target.value)}
                  className="h-12 px-3 rounded-2xl bg-background border border-border text-sm font-medium shrink-0 focus:ring-2 focus:ring-primary"
                >
                  <option value="عام">بحث عام</option>
                  <option value="فيديوهات تعليمية">فيديوهات تعليمية</option>
                  <option value="أسئلة قدرات ومناهج">أسئلة قدرات ومناهج</option>
                </select>
              </form>`
);

// For the navbar browser input (the hidden md:flex one)
// We might just leave it as is or add it too. Let's just leave it general.

fs.writeFileSync('src/pages/platforms.tsx', content, 'utf8');
