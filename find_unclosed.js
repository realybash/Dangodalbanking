
const fs = require('fs');
const content = fs.readFileSync('/src/components/GatewayScreen.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let pos = 0;
  while (true) {
    const open = line.indexOf('<button', pos);
    const close = line.indexOf('</button>', pos);
    
    if (open !== -1 && (close === -1 || open < close)) {
      stack.push(i + 1);
      pos = open + 7;
    } else if (close !== -1 && (open === -1 || close < open)) {
      if (stack.length > 0) {
        stack.pop();
      } else {
        console.log(`Extra closing button at line ${i + 1}`);
      }
      pos = close + 9;
    } else {
      break;
    }
  }
}

if (stack.length > 0) {
  console.log(`Unclosed buttons started at lines: ${stack.join(', ')}`);
}
