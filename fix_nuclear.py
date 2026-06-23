#!/usr/bin/env python3
import re, subprocess, os

with open('card.html', 'rb') as f:
    data = f.read()

# Find the section between timeWarp's proper end and const S={}
# Look for timeWarp's addLog
idx = data.find(b"addLog('\\xe2\\x8f\\xb3 \\xe6\\x97\\xb6\\xe9\\x97\\xb4\\xe6\\x89\\xad\\xe6\\x9b\\xb2")
if idx > 0:
    # Find the }}); that closes timeWarp
    end_tw = data.find(b'}});', idx)
    if end_tw > 0:
        end_tw += 4  # include }});
    else:
        end_tw = idx + 200

# Find const S={
s_idx = data.find(b'\nconst S={')
if s_idx < 0:
    s_idx = data.find(b'\r\nconst S={')

# Remove everything between timeWarp close and const S={
if end_tw and s_idx and end_tw < s_idx:
    # Check what's in between
    between = data[end_tw:s_idx]
    print(f"Between timeWarp and S={{: {len(between)} bytes")
    # Show non-empty lines
    lines = between.split(b'\n')
    for i, line in enumerate(lines):
        if line.strip():
            print(f"  Line: {line[:100]}")

    # Remove the section
    data = data[:end_tw] + data[s_idx:]
    print("Removed broken section")

with open('card.html', 'wb') as f:
    f.write(data)

m = re.search(rb'<script>(.*?)</script>', data, re.DOTALL)
with open('_tc.js', 'wb') as out:
    out.write(m.group(1))
r = subprocess.run(['node', '--check', '_tc.js'], capture_output=True, text=True)
print("JS OK" if r.returncode == 0 else f"Error: {r.stderr[:150]}")
os.remove('_tc.js')
