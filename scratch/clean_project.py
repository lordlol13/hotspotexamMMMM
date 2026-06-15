import os
import re

def remove_emojis_from_readme():
    readme_path = "README.md"
    if not os.path.exists(readme_path):
        print("README.md not found!")
        return
    
    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Regex for matching emojis
    emoji_pattern = re.compile(
        "["
        "\U00010000-\U0010ffff"  # Supplemental planes (emojis, etc)
        "\u2600-\u27BF"          # Miscellaneous Symbols and Dingbats
        "\u2300-\u23FF"          # Miscellaneous Technical
        "\u2B50"                 # Star emoji
        "]+", 
        flags=re.UNICODE
    )
    
    clean_content = emoji_pattern.sub("", content)
    
    # Also clean up any double spaces that might result from emoji removal
    clean_content = re.sub(r' +', ' ', clean_content)
    
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(clean_content)
    print("Emojis removed from README.md.")


def strip_js_ts_comments(content):
    """
    Strips single-line and multi-line comments from JS/TS code.
    Handles strings, regex literals, and template literals to avoid false positives.
    """
    out = []
    i = 0
    n = len(content)
    state = "NORMAL" # NORMAL, S_STRING, D_STRING, TEMPLATE, S_COMMENT, M_COMMENT, REGEX
    
    while i < n:
        char = content[i]
        next_char = content[i+1] if i + 1 < n else ""
        
        if state == "NORMAL":
            if char == "/" and next_char == "/":
                state = "S_COMMENT"
                i += 2
                continue
            elif char == "/" and next_char == "*":
                state = "M_COMMENT"
                i += 2
                continue
            elif char == "'":
                state = "S_STRING"
                out.append(char)
            elif char == '"':
                state = "D_STRING"
                out.append(char)
            elif char == "`":
                state = "TEMPLATE"
                out.append(char)
            elif char == "/" and (len(out) == 0 or out[-1] in "=(,[;?:!&|{"):
                # Simple heuristic for division vs regex literal
                state = "REGEX"
                out.append(char)
            else:
                out.append(char)
        elif state == "S_COMMENT":
            if char == "\n":
                state = "NORMAL"
                out.append(char)
        elif state == "M_COMMENT":
            if char == "*" and next_char == "/":
                state = "NORMAL"
                i += 2
                continue
        elif state == "S_STRING":
            out.append(char)
            if char == "\\" and next_char == "'":
                out.append(next_char)
                i += 2
                continue
            elif char == "'":
                state = "NORMAL"
        elif state == "D_STRING":
            out.append(char)
            if char == "\\" and next_char == '"':
                out.append(next_char)
                i += 2
                continue
            elif char == '"':
                state = "NORMAL"
        elif state == "TEMPLATE":
            out.append(char)
            if char == "\\" and next_char == "`":
                out.append(next_char)
                i += 2
                continue
            elif char == "`":
                state = "NORMAL"
        elif state == "REGEX":
            out.append(char)
            if char == "\\" and next_char == "/":
                out.append(next_char)
                i += 2
                continue
            elif char == "/":
                state = "NORMAL"
        
        i += 1
        
    return "".join(out)


def strip_python_comments(content):
    """
    Strips single-line comments from Python code.
    Preserves all strings (including triple-quoted ones) and formatting.
    """
    out = []
    i = 0
    n = len(content)
    state = "NORMAL" # NORMAL, S_STRING, D_STRING, T_S_STRING, T_D_STRING, COMMENT
    
    while i < n:
        char = content[i]
        next_char = content[i+1] if i + 1 < n else ""
        next_two = content[i+1:i+3] if i + 2 < n else ""
        
        if state == "NORMAL":
            if char == "#":
                state = "COMMENT"
                i += 1
                continue
            elif char == "'" and next_two == "''":
                state = "T_S_STRING"
                out.append("'''")
                i += 3
                continue
            elif char == '"' and next_two == '""':
                state = "T_D_STRING"
                out.append('"""')
                i += 3
                continue
            elif char == "'":
                state = "S_STRING"
                out.append(char)
            elif char == '"':
                state = "D_STRING"
                out.append(char)
            else:
                out.append(char)
        elif state == "COMMENT":
            if char == "\n":
                state = "NORMAL"
                out.append(char)
        elif state == "S_STRING":
            out.append(char)
            if char == "\\" and next_char == "'":
                out.append(next_char)
                i += 2
                continue
            elif char == "'":
                state = "NORMAL"
        elif state == "D_STRING":
            out.append(char)
            if char == "\\" and next_char == '"':
                out.append(next_char)
                i += 2
                continue
            elif char == '"':
                state = "NORMAL"
        elif state == "T_S_STRING":
            out.append(char)
            if char == "'" and next_two == "''":
                out.append("''")
                state = "NORMAL"
                i += 3
                continue
        elif state == "T_D_STRING":
            out.append(char)
            if char == '"' and next_two == '""':
                out.append('""')
                state = "NORMAL"
                i += 3
                continue
        
        i += 1
        
    return "".join(out)


def clean_source_files():
    # Directories to scan
    targets = [
        ("backend/app", [".py"]),
        ("frontend/src", [".ts", ".tsx", ".js", ".jsx"])
    ]
    
    for folder, extensions in targets:
        if not os.path.exists(folder):
            print(f"Directory {folder} does not exist. Skipping.")
            continue
            
        for root, _, files in os.walk(folder):
            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in extensions:
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8") as f:
                        original_content = f.read()
                    
                    if ext == ".py":
                        clean_content = strip_python_comments(original_content)
                    else:
                        clean_content = strip_js_ts_comments(original_content)
                        
                    # Remove trailing whitespaces on lines
                    lines = [line.rstrip() for line in clean_content.splitlines()]
                    
                    # Remove multiple consecutive blank lines
                    cleaned_lines = []
                    prev_blank = False
                    for line in lines:
                        if line == "":
                            if not prev_blank:
                                cleaned_lines.append(line)
                                prev_blank = True
                        else:
                            cleaned_lines.append(line)
                            prev_blank = False
                            
                    clean_content = "\n".join(cleaned_lines) + "\n"
                    
                    if clean_content != original_content:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(clean_content)
                        print(f"Cleaned comments in: {file_path}")

if __name__ == "__main__":
    remove_emojis_from_readme()
    clean_source_files()
    print("Project cleaning completed!")
