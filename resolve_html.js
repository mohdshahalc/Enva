const fs = require('fs');
const path = require('path');

const dir = 'c:/Enva/public/UI';
const files = fs.readdirSync(dir);
let resolvedCount = 0;

files.forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('<<<<<<< HEAD')) {
            // Replaces the conflict block with the remote state + search.js
            content = content.replace(/<<<<<<< HEAD[\s\S]*?=======([\s\S]*?)>>>>>>> [a-f0-9A-F]+/g, (match, remoteContent) => {
                let newContent = remoteContent.trim();
                newContent += '\n<script src="search.js" defer></script>\n';
                return newContent;
            });
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Resolved HTML file: ${file}`);
            resolvedCount++;
        }
    }
});

console.log(`Successfully resolved ${resolvedCount} HTML files.`);
