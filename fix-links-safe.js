const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const replacements = {
  'Messages': 'messages.html',
  'Health Profile': 'health-profile.html',
};

const backupDir = path.join(__dirname, 'backup_html');

function fixLink(content) {
  // Regex to match an entire anchor with href="#" and exact text "Messages" or "Health Profile"
  const anchorRegex = /(<a\s+[^>]*?href="#"[^>]*>)([\s\S]*?)(Messages|Health Profile)([\s\S]*?)<\/a>/gi;

  return content.replace(anchorRegex, (match, openTag, before, text, after) => {
    const key = text.trim();
    const newHref = replacements[key];
    if (!newHref) return match;
    const newOpenTag = openTag.replace(/href="#"/i, `href="${newHref}"`);
    return `${newOpenTag}${before}${key}${after}</a>`;
  });
}

// Create backup folder if needed
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(publicDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = fixLink(content);

  if (newContent !== content) {
    // Show preview of what will change
    console.log(`\n📄 ${file}:`);
    const originalLines = content.split('\n');
    const newLines = newContent.split('\n');
    for (let i = 0; i < originalLines.length; i++) {
      if (originalLines[i] !== newLines[i]) {
        console.log(`  OLD: ${originalLines[i].trim()}`);
        console.log(`  NEW: ${newLines[i].trim()}`);
      }
    }
  }
}

// Ask user for confirmation
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question('\nApply these changes? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    for (const file of files) {
      const filePath = path.join(publicDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const newContent = fixLink(content);
      if (newContent !== content) {
        // Backup original
        fs.writeFileSync(path.join(backupDir, file), content, 'utf8');
        // Write new content
        fs.writeFileSync(filePath, newContent, 'utf8');
        updatedCount++;
        console.log(`✅ Updated: ${file}`);
      }
    }
    console.log(`\nDone. Updated ${updatedCount} files. Backups saved in ${backupDir}.`);
  } else {
    console.log('No changes applied.');
  }
  readline.close();
});