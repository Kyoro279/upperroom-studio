const fs = require('fs');
const path = require('path');

const dir = 'd:/UpperRoom/frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'footer.html');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    const regex = /<footer class="site-footer">[\s\S]*?<\/footer>/g;
    if (regex.test(content)) {
        content = content.replace(regex, '<div id="footer-placeholder"></div>');
        fs.writeFileSync(filePath, content);
        console.log('Replaced in ' + file);
    }
}
