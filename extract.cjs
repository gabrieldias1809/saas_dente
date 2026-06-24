const fs = require('fs');
const content = fs.readFileSync('laudo.html', 'utf8');
const match = content.match(/const PDF_B64 = \"(.*?)\";/);
if (match) {
  const b64 = match[1];
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync('temp.pdf', buf);
  console.log('Saved to temp.pdf, size: ' + buf.length);
}
