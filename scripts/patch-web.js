#!/usr/bin/env node
// Post-build patch for Expo web export
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('ERROR: dist/index.html not found');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Add type="module" to script tags (needed for import.meta in bundle)
html = html.replace(/<script src=/g, '<script type="module" src=');

// 2. Add global error handler to surface JS errors visually on the page
const errorScript = `<script>
window.onerror = function(msg, src, line, col, err) {
  var d = document.getElementById("root");
  if (d && !d.innerHTML.trim()) {
    d.innerHTML = '<div style="padding:40px;font-family:monospace">' +
      '<h2 style="color:red">JS Error</h2>' +
      '<pre style="white-space:pre-wrap;color:#333">' + msg + '\\n' + (src||'') + ':' + line + '</pre></div>';
  }
};
</script>`;

html = html.replace('</body>', errorScript + '\n</body>');

fs.writeFileSync(htmlPath, html);
console.log('Patched dist/index.html successfully');

// Verify
const result = fs.readFileSync(htmlPath, 'utf8');
const scripts = result.match(/<script[^>]*>/g) || [];
scripts.forEach(s => console.log(' ', s));
