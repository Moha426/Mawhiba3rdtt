const fs = require('fs');
let content = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

const oldSetter = `  const setPersistentState = (val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof val === "function" ? (val as any)(prev) : val;
      try {
        localStorage.setItem(\`app_data_\${key}\`, JSON.stringify(next));
        if (key === "flashcards") {
          localStorage.setItem("talented_english_flashcards_v1", JSON.stringify(next));
          window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: next } }));
        } else if (key === "platforms") {
          localStorage.setItem("talented_school_custom_platforms_v1", JSON.stringify(next));
          localStorage.setItem("custom_educational_platforms_v3", JSON.stringify(next));
          window.dispatchEvent(new CustomEvent("platforms_storage_change", { detail: { platforms: next } }));
        }
      } catch {}
      window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key, value: next } }));
      return next;
    });
  };`;

const newSetter = `  const setPersistentState = (val: T | ((prev: T) => T)) => {
    let prev = state;
    try {
      const raw = localStorage.getItem(\`app_data_\${key}\`);
      if (raw) prev = JSON.parse(raw);
    } catch {}
    
    const next = typeof val === "function" ? (val as any)(prev) : val;
    
    try {
      localStorage.setItem(\`app_data_\${key}\`, JSON.stringify(next));
      if (key === "flashcards") {
        localStorage.setItem("talented_english_flashcards_v1", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: next } }));
      } else if (key === "platforms") {
        localStorage.setItem("talented_school_custom_platforms_v1", JSON.stringify(next));
        localStorage.setItem("custom_educational_platforms_v3", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("platforms_storage_change", { detail: { platforms: next } }));
      }
    } catch {}
    
    window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key, value: next } }));
    setState(next);
  };`;

content = content.replace(oldSetter, newSetter);
fs.writeFileSync('src/lib/api-client-react.ts', content);
