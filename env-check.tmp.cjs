const fs = require('node:fs');

const keys = ['CHURCH_HOST', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_CHURCH_SITE_URL'];
const lines = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8').split(/\r?\n/) : [];
for (const key of keys) {
  const line = lines.find((candidate) => candidate.startsWith(`${key}=`));
  const value = line ? line.slice(key.length + 1).trim().replaceAll('"', '').replaceAll("'", '') : '';
  console.log(`${key}: ${value || '(unset)'}`);
}
