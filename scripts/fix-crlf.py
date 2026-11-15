from pathlib import Path

root = Path("/mnt/c/Users/moham/Documents/GitHub/drunix/drunix/drunix-network/test-network")
cr = bytes([13])
changed = []
for path in list(root.rglob("*.sh")) + [root / "network.config"]:
    if not path.is_file():
        continue
    if "C:Users" in str(path):
        continue
    data = path.read_bytes()
    if cr not in data:
        continue
    path.write_bytes(data.replace(cr, b""))
    changed.append(str(path.relative_to(root)))

print("fixed", len(changed), "files")
for name in changed:
    print(name)
