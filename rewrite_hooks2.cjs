const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

// I will just use a robust replace loop using string finding to avoid regex complexity!
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('mutate: (')) {
        let argNameMatch = lines[i].match(/mutate:\s*\(\s*([A-Za-z0-9_]+)\s*:/);
        if (!argNameMatch) {
            argNameMatch = lines[i].match(/mutate:\s*\(\s*([A-Za-z0-9_]+)\s*,/);
        }
        if (!argNameMatch) continue;
        const arg = argNameMatch[1]; // e.g. item, e, id, payload, data

        if (i + 1 < lines.length && lines[i+1].includes('((prev) =>')) {
            let nextLine = lines[i+1];
            if (nextLine.includes('prev.map')) {
                // It's an update hook!
                const setterMatch = nextLine.match(/\s*(set[A-Za-z0-9_]+)\(\(prev/);
                if (setterMatch) {
                    const setter = setterMatch[1];
                    // We rewrite it!
                    lines[i] = `    mutate: (payload: any, opts?: any) => {`;
                    lines[i+1] = `      const id = payload?.id || payload; const data = payload?.data || payload; ${setter}((prev: any) => prev.map((x: any) => (x.id === id ? { ...x, ...data } : x)));`;
                }
            } else if (nextLine.includes('prev.filter')) {
                const setterMatch = nextLine.match(/\s*(set[A-Za-z0-9_]+)\(\(prev/);
                if (setterMatch) {
                    const setter = setterMatch[1];
                    lines[i] = `    mutate: (payload: any, opts?: any) => {`;
                    lines[i+1] = `      const id = typeof payload === 'object' ? payload?.id : payload; ${setter}((prev: any) => prev.filter((x: any) => x.id !== id));`;
                }
            } else if (nextLine.includes(', ...prev]') || nextLine.includes('...prev, {')) {
                const setterMatch = nextLine.match(/\s*(set[A-Za-z0-9_]+)\(\(prev/);
                if (setterMatch) {
                    const setter = setterMatch[1];
                    const appendToEnd = nextLine.includes('...prev, {');
                    lines[i] = `    mutate: (payload: any, opts?: any) => {`;
                    if (appendToEnd) {
                        lines[i+1] = `      const data = payload?.data || payload; ${setter}((prev: any) => [...prev, { ...data, id: Date.now() }]);`;
                    } else {
                        lines[i+1] = `      const data = payload?.data || payload; ${setter}((prev: any) => [{ ...data, id: Date.now() }, ...prev]);`;
                    }
                }
            }
        }
    } else if (lines[i].includes('mutateAsync: async (')) {
        let argNameMatch = lines[i].match(/mutateAsync:\s*async\s*\(\s*([A-Za-z0-9_]+)\s*:/);
        if (!argNameMatch) {
            argNameMatch = lines[i].match(/mutateAsync:\s*async\s*\(\s*([A-Za-z0-9_]+)\s*\)/);
        }
        if (!argNameMatch) continue;
        const arg = argNameMatch[1];

        if (lines[i].includes('((prev) =>')) {
            let nextLine = lines[i];
            if (nextLine.includes('prev.map')) {
                const setterMatch = nextLine.match(/=>\s*(set[A-Za-z0-9_]+)\(\(prev/);
                if (setterMatch) {
                    const setter = setterMatch[1];
                    lines[i] = `    mutateAsync: async (payload: any) => { const id = payload?.id || payload; const data = payload?.data || payload; return ${setter}((prev: any) => prev.map((x: any) => (x.id === id ? { ...x, ...data } : x))); }`;
                }
            } else if (nextLine.includes('prev.filter')) {
                const setterMatch = nextLine.match(/=>\s*(set[A-Za-z0-9_]+)\(\(prev/);
                if (setterMatch) {
                    const setter = setterMatch[1];
                    lines[i] = `    mutateAsync: async (payload: any) => { const id = typeof payload === 'object' ? payload?.id : payload; return ${setter}((prev: any) => prev.filter((x: any) => x.id !== id)); }`;
                }
            } else if (nextLine.includes(', ...prev]') || nextLine.includes('...prev, {')) {
                const setterMatch = nextLine.match(/=>\s*(set[A-Za-z0-9_]+)\(\(prev/);
                if (setterMatch) {
                    const setter = setterMatch[1];
                    const appendToEnd = nextLine.includes('...prev, {');
                    if (appendToEnd) {
                        lines[i] = `    mutateAsync: async (payload: any) => { const data = payload?.data || payload; return ${setter}((prev: any) => [...prev, { ...data, id: Date.now() }]); }`;
                    } else {
                        lines[i] = `    mutateAsync: async (payload: any) => { const data = payload?.data || payload; return ${setter}((prev: any) => [{ ...data, id: Date.now() }, ...prev]); }`;
                    }
                }
            }
        }
    }
}

fs.writeFileSync('src/lib/api-client-react.ts', lines.join('\n'));
