const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');

const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

for (const file of htmlFiles) {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Messages link
  content = content.replace(/<a href="#" class="side-link">\s*Messages\s*<\/a>/g, '<a href="messages.html" class="side-link">Messages</a>');
  content = content.replace(/<a href="#" class="side-link">\s*Health Profile\s*<\/a>/g, '<a href="health-profile.html" class="side-link">Health Profile</a>');
  // Also top nav items if they exist
  content = content.replace(/<a class="nav-link" href="#">Messages<\/a>/g, '<a class="nav-link" href="messages.html">Messages</a>');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${file}`);
}
console.log('Done updating links.');