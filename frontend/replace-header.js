const fs = require('fs');
const path = require('path');

const dir = 'd:/UpperRoom/frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'header.html' && f !== 'footer.html');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    const startIndex = content.indexOf('<header class="navbar">');
    const endIndex = content.indexOf('</header>', startIndex);
    
    if (startIndex !== -1 && endIndex !== -1) {
        const fullHeader = content.substring(startIndex, endIndex + '</header>'.length);
        content = content.replace(fullHeader, '<div id="header-placeholder"></div>');
        fs.writeFileSync(filePath, content);
        console.log('Replaced header in ' + file);
    }
}
