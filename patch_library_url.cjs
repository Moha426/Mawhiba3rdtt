const fs = require('fs');
let content = fs.readFileSync('src/components/admin/library-tab.tsx', 'utf8');

const urlInput = `
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">رابط خارجي (اختياري)</label>
              <Input
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="أدخل رابط الملف أو المقطع إذا لم تقم برفع ملف"
                className="rounded-xl text-xs h-10"
                type="url"
                dir="ltr"
              />
            </div>
`;

content = content.replace(
  'onChange={e => setFormTitle(e.target.value)}',
  'onChange={e => setFormTitle(e.target.value)}'
);

// We need to inject urlInput after the Title input.
content = content.replace(
  /<Input\s+value={formTitle}[\s\S]*?required\s*\/>\s*<\/div>/,
  `$&
${urlInput}`
);

fs.writeFileSync('src/components/admin/library-tab.tsx', content, 'utf8');
