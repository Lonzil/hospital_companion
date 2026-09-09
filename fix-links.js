const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

function replaceLinks(content) {
  // Replace sidebar links
  content = content.replace(/<a href="#" class="side-link">\s*Messages\s*<\/a>/g, '<a href="messages.html" class="side-link">Messages</a>');
  content = content.replace(/<a href="#" class="side-link">\s*Health Profile\s*<\/a>/g, '<a href="health-profile.html" class="side-link">Health Profile</a>');
  // Replace top nav links
  content = content.replace(/<a class="nav-link" href="#">Messages<\/a>/g, '<a class="nav-link" href="messages.html">Messages</a>');
  return content;
}

for (const file of files) {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const newContent = replaceLinks(content);
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Updated: ${file}`);
  }
}
console.log('Done.');