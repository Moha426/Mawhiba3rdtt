const fs = require('fs');
const code = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');
const lines = code.split('\n');

const errors = [334, 343, 352, 368, 377, 386, 479, 488, 497, 519, 528, 537, 563, 572, 581, 603, 681, 690];
errors.forEach(lineNum => {
    console.log(`Line ${lineNum}: ${lines[lineNum - 1]}`);
});
