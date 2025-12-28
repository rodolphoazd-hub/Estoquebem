
const fs = require('fs');

const sourcePath = 'index2.html';
try {
    const content = fs.readFileSync(sourcePath, 'utf8');
    // Normalize line endings to avoid issues with split
    const lines = content.replace(/\r\n/g, '\n').split('\n');

    console.log(`Total lines read: ${lines.length}`);

    // Ranges (0-based indices)

    // CSS: Line 16 to 155 (inclusive) -> indices 15 to 154
    // Slice end is exclusive, so 155
    const cssLines = lines.slice(15, 155);
    const cssContent = cssLines.join('\n');
    console.log(`CSS Lines: ${cssLines.length} (Expected around 140)`);

    // JS: Line 2447 to 8131 (inclusive) -> indices 2446 to 8130
    // Slice end is exclusive, so 8131
    const jsLines = lines.slice(2446, 8131);
    const jsContent = jsLines.join('\n');
    console.log(`JS Lines: ${jsLines.length} (Expected around 5685)`);

    // HTML Parts:
    // Part 1: 1-14 -> indices 0 to 13 -> slice(0, 14)
    const htmlPart1 = lines.slice(0, 14).join('\n');

    // Part 2: 157-2445 -> indices 156 to 2444 -> slice(156, 2445)
    // Note: Line 157 was </head>, I want to include it?
    // Step 449 showed: 156: </style>, 157: </head>.
    // So line 157 should be in HTML Part 2. Yes.
    const htmlPart2 = lines.slice(156, 2445).join('\n');

    // Part 3: 8133-end -> indices 8132 to end -> slice(8132)
    const htmlPart3 = lines.slice(8132).join('\n');

    // Create directories if not exist
    if (!fs.existsSync('css')) fs.mkdirSync('css');
    if (!fs.existsSync('js')) fs.mkdirSync('js');

    fs.writeFileSync('css/style.css', cssContent);
    fs.writeFileSync('js/app.js', jsContent);

    const htmlContent = `${htmlPart1}
    <link rel="stylesheet" href="css/style.css">
${htmlPart2}
            <script src="js/app.js"></script>
${htmlPart3}`;

    fs.writeFileSync('index.html', htmlContent);

    console.log('Files split successfully into css/style.css, js/app.js, and index.html');

} catch (err) {
    console.error('Error:', err);
}
