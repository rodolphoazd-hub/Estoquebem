
import os

def split_files():
    source_path = 'index2.html'
    
    with open(source_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # CSS Range: 16-155 (1-based) -> indices 15:155
    # (Line 16 is index 15. Line 155 is index 154. Splice [15:155] gives 15..154)
    css_content = "".join(lines[15:155])
    
    # JS Range: 2447-8131 (1-based) -> indices 2446:8131
    # (Line 2447 is index 2446. Line 8131 is index 8130. Splice [2446:8131] gives 2446..8130)
    js_content = "".join(lines[2446:8131])
    
    # HTML Parts
    # Part 1: 1-14 -> indices 0:14
    html_part1 = "".join(lines[0:14])
    
    # Part 2: 157-2445 -> indices 156:2445 (Line 157 is index 156)
    html_part2 = "".join(lines[156:2445])
    
    # Part 3: 8133-end -> indices 8132:
    html_part3 = "".join(lines[8132:])
    
    # Write CSS
    with open('css/style.css', 'w', encoding='utf-8') as f:
        f.write(css_content)
        
    # Write JS
    with open('js/app.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    # Write HTML
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_part1)
        f.write('    <link rel="stylesheet" href="css/style.css">\n')
        f.write(html_part2)
        f.write('            <script src="js/app.js"></script>\n')
        f.write(html_part3)
        
    print("Files split successfully!")

if __name__ == "__main__":
    split_files()
