const fs = require('fs');
let content = fs.readFileSync('src/components/admin/platforms-tab.tsx', 'utf8');

// Replace state
content = content.replace(
  'const [formCategory, setFormCategory] = useState("قدرات وتحصيلي");',
  'const [formCategory, setFormCategory] = useState("قدرات وتحصيلي");\n  const [formCategories, setFormCategories] = useState<string[]>([]);\n  const [formOpenInNewTab, setFormOpenInNewTab] = useState(true);'
);

// handleOpenAdd
content = content.replace(
  'setFormCategory(categories[0] || "قدرات وتحصيلي");',
  'setFormCategory(categories[0] || "قدرات وتحصيلي");\n    setFormCategories([]);\n    setFormOpenInNewTab(true);'
);

// handleOpenEdit
content = content.replace(
  'setFormCategory(item.category);',
  'setFormCategory(item.category);\n    setFormCategories(item.categories || (item.category ? [item.category] : []));\n    setFormOpenInNewTab(item.openInNewTab ?? true);'
);

// update logic
content = content.replace(
  'category: formCategory,',
  'category: formCategories[0] || formCategory,\n            categories: formCategories.length > 0 ? formCategories : [formCategory],\n            openInNewTab: formOpenInNewTab,'
);
// note: second instance (create)
content = content.replace(
  'category: formCategory,',
  'category: formCategories[0] || formCategory,\n        categories: formCategories.length > 0 ? formCategories : [formCategory],\n        openInNewTab: formOpenInNewTab,'
);

// the select in form
content = content.replace(
  /<select[\s\S]*?<\/select>/,
  `<div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(c => {
                      const isSelected = formCategories.includes(c);
                      return (
                        <Badge 
                          key={c}
                          variant={isSelected ? "default" : "outline"}
                          className={\`cursor-pointer hover:opacity-80 \${isSelected ? "" : "opacity-60"}\`}
                          onClick={() => {
                            if (isSelected) {
                              setFormCategories(prev => prev.filter(cat => cat !== c));
                            } else {
                              setFormCategories(prev => [...prev, c]);
                            }
                          }}
                        >
                          {c}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">يمكنك اختيار أكثر من تصنيف.</p>
                </div>`
);

// insert Checkbox for openInNewTab
content = content.replace(
  '</form>',
  `  <div className="flex items-center gap-2 mt-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                <input 
                  type="checkbox" 
                  id="openInNewTab"
                  checked={formOpenInNewTab}
                  onChange={e => setFormOpenInNewTab(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="openInNewTab" className="text-xs font-bold text-foreground cursor-pointer select-none">
                  فتح الرابط في نافذة جديدة
                </label>
              </div>
            </form>`
);

// Import Badge if not present
if (!content.includes('Badge')) {
  content = content.replace(
    'import { Button } from "@/components/ui/button";',
    'import { Button } from "@/components/ui/button";\nimport { Badge } from "@/components/ui/badge";'
  );
}

fs.writeFileSync('src/components/admin/platforms-tab.tsx', content, 'utf8');
