const fs = require('fs');

function patchAssignments() {
  let content = fs.readFileSync('src/components/admin/assignments-tab.tsx', 'utf8');
  if (!content.includes('formExternalUrl')) {
    content = content.replace(
      'const [formDesc, setFormDesc] = useState("");',
      'const [formDesc, setFormDesc] = useState("");\n  const [formExternalUrl, setFormExternalUrl] = useState("");'
    );
    content = content.replace(
      'setFormDesc("");',
      'setFormDesc("");\n    setFormExternalUrl("");'
    );
    content = content.replace(
      'setFormDesc(item.description);',
      'setFormDesc(item.description);\n    setFormExternalUrl(item.externalUrl || "");'
    );
    content = content.replace(
      'description: formDesc.trim() || "واجب جديد بدون وصف",',
      'description: formDesc.trim() || "واجب جديد بدون وصف",\n        externalUrl: formExternalUrl.trim() || undefined,'
    );
    content = content.replace(
      'description: formDesc.trim() || "واجب جديد بدون وصف",', // second time
      'description: formDesc.trim() || "واجب جديد بدون وصف",\n        externalUrl: formExternalUrl.trim() || undefined,'
    );
    
    const inputHtml = `
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">رابط خارجي للواجب (اختياري)</label>
              <Input
                value={formExternalUrl}
                onChange={e => setFormExternalUrl(e.target.value)}
                placeholder="أدخل رابط الواجب إذا كان على منصة أخرى"
                className="rounded-xl text-xs h-10"
                type="url"
                dir="ltr"
              />
            </div>
`;
    content = content.replace(
      /<Input\s+value={formTitle}[\s\S]*?required\s*\/>\s*<\/div>/,
      `$&
${inputHtml}`
    );
    fs.writeFileSync('src/components/admin/assignments-tab.tsx', content, 'utf8');
  }
}

function patchQuizzes() {
  let content = fs.readFileSync('src/components/admin/quizzes-tab.tsx', 'utf8');
  if (!content.includes('formExternalUrl')) {
    content = content.replace(
      'const [formDesc, setFormDesc] = useState("");',
      'const [formDesc, setFormDesc] = useState("");\n  const [formExternalUrl, setFormExternalUrl] = useState("");'
    );
    content = content.replace(
      'setFormDesc("");',
      'setFormDesc("");\n    setFormExternalUrl("");'
    );
    content = content.replace(
      'setFormDesc(item.description);',
      'setFormDesc(item.description);\n    setFormExternalUrl(item.externalUrl || "");'
    );
    content = content.replace(
      'description: formDesc.trim() || "اختبار جديد بدون وصف",',
      'description: formDesc.trim() || "اختبار جديد بدون وصف",\n        externalUrl: formExternalUrl.trim() || undefined,'
    );
    content = content.replace(
      'description: formDesc.trim() || "اختبار جديد بدون وصف",', // second time
      'description: formDesc.trim() || "اختبار جديد بدون وصف",\n        externalUrl: formExternalUrl.trim() || undefined,'
    );
    
    const inputHtml = `
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">رابط خارجي للاختبار (اختياري)</label>
              <Input
                value={formExternalUrl}
                onChange={e => setFormExternalUrl(e.target.value)}
                placeholder="أدخل رابط الاختبار إذا كان على منصة أخرى"
                className="rounded-xl text-xs h-10"
                type="url"
                dir="ltr"
              />
            </div>
`;
    content = content.replace(
      /<Input\s+value={formTitle}[\s\S]*?required\s*\/>\s*<\/div>/,
      `$&
${inputHtml}`
    );
    fs.writeFileSync('src/components/admin/quizzes-tab.tsx', content, 'utf8');
  }
}

patchAssignments();
patchQuizzes();
