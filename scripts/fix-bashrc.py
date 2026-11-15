from pathlib import Path

p = Path("/home/haris/.bashrc")
lines = []
for ln in p.read_text().splitlines():
    if "local/go/bin" in ln:
        continue
    if ln.strip() in {"export", "nexport"}:
        continue
    lines.append(ln)
lines.append('export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"')
p.write_text("\n".join(lines) + "\n")
print("fixed")
print(p.read_text().splitlines()[-1])
