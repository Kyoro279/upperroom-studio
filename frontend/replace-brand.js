const fs = require('fs');
const path = require('path');

const dir = 'd:/UpperRoom/frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the brand div
    const oldBrand = /<div class="brand">The Upper Room <span class="sub-brand">\/ 3D PRINT STUDIO<\/span><\/div>/g;
    const newBrand = '<div class="brand" style="display:flex; align-items:center; gap:10px;"><img src="assets/upperroomlogo.png" alt="The Upper Room Logo" style="height:40px; object-fit:contain;"> The UpperRoom</div>';
    
    if (oldBrand.test(content)) {
        content = content.replace(oldBrand, newBrand);
        fs.writeFileSync(filePath, content);
        console.log('Replaced in ' + file);
    }
}
