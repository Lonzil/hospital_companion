const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const faqLinkHtml = '<a href="faqs.html">FAQs</a>';

// Get all .html files in public, excluding faqs.html
const htmlFiles = fs.readdirSync(publicDir).filter(file => file.endsWith('.html') && file !== 'faqs.html');

function insertFaqLink(content) {
  // If link already exists, do nothing
  if (content.includes('href="faqs.html"')) {
    return content;
  }

  // Try to insert after known footer links, in order of preference
  const patterns = [
    '<a href="contact-help.html">',
    '<a href="privacy-policy.html">',
    '<a href="terms-of-service.html">',
    '<a href="ai-support.html">',
    '<a href="#">'
  ];

  for (const pattern of patterns) {
    const index = content.lastIndexOf(pattern);
    if (index !== -1) {
      // Find the closing </a> after the pattern
      const closingIndex = content.indexOf('</a>', index);
      if (closingIndex !== -1) {
        // Insert after the closing </a>
        const insertAt = closingIndex + 4;
        return content.slice(0, insertAt) + '\n' + faqLinkHtml + content.slice(insertAt);
      }
    }
  }

  // Fallback: insert before </footer> or before </body>
  const footerClose = content.lastIndexOf('</footer>');
  if (footerClose !== -1) {
    return content.slice(0, footerClose) + faqLinkHtml + '\n' + content.slice(footerClose);
  }

  // Last resort: insert before </body>
  const bodyClose = content.lastIndexOf('</body>');
  if (bodyClose !== -1) {
    return content.slice(0, bodyClose) + faqLinkHtml + '\n' + content.slice(bodyClose);
  }

  // No insertion point found, return unchanged
  return content;
}

let updatedCount = 0;

for (const file of htmlFiles) {
  const filePath = path.join(publicDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = insertFaqLink(content);
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    updatedCount++;
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`⏭️  Skipped (no change or already has link): ${file}`);
  }
}

console.log(`\nDone. Updated ${updatedCount} files.`);