const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

function replaceSidebarLinks(content) {
  // Replace any anchor whose text is exactly "Messages" and href is "#"
  content = content.replace(/<a\s+href="#"\s+class="([^"]*)"[^>]*>\s*Messages\s*<\/a>/g, (match, cls) => {
    return `<a href="messages.html" class="${cls}">Messages</a>`;
  });

  // Replace any anchor whose text is exactly "Health Profile" and href is "#"
  content = content.replace(/<a\s+href="#"\s+class="([^"]*)"[^>]*>\s*Health Profile\s*<\/a>/g, (match, cls) => {
    return `<a href="health-profile.html" class="${cls}">Health Profile</a>`;
  });

  return content;
}

let updated = 0;
for (const file of htmlFiles) {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const newContent = replaceSidebarLinks(content);
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    updated++;
    console.log(`✅ Updated: ${file}`);
  }
}
console.log(`\nDone. Updated ${updated} files.`);