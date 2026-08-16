const fs = require('fs');
let code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

// We want to add `isPending: false,` to every object that returns `mutate: ` but doesn't have it.
code = code.replace(/return\s*\{\s*(?!isPending)([^}]*mutate:)/g, "return {\n    isPending: false,\n    $1");

// Then, for every `mutate: (arg) => singleStatement` we need to convert it to a block that also calls `opts?.onSuccess?.()`.
// Actually, we can just replace all `mutate: (xyz) => ...` if they aren't already block statements handling opts.

// Instead of regex, let's just rewrite the problematic ones. Or use a simpler regex.
// Find all:
// mutate: (payload: any) => { setX(...); opts?.onSuccess?.(); }
// wait, looking at my previous script `add_is_pending.cjs`:
// code = code.replace(/return\s*\{\s*mutate:/g, "return {\n    isPending: false,\n    mutate:");
// This missed cases where there was something before mutate, like `data: ...`

// Let's just fix everything to return a valid object.
