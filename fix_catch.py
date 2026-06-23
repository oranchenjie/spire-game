#!/usr/bin/env python3
import sys, io, re, subprocess, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('card.html', 'rb') as f:
    data = f.read()

old = b'\n\t    }catch(e){ctx.globalAlpha=1;ctx.shadowBlur=0;console.error("\xe5\x8d\xa1\xe9\x9d\xa2\xe6\xb8\xb2\xe6\x9f\x93\xe9\x94\x99\xe8\xaf\xaf:",e);}// \xe8\xb4\xb9\xe7\x94\xa8\xe5\x9c\x86('
new = b'\n\t    // \xe8\xb4\xb9\xe7\x94\xa8\xe5\x9c\x86('
if old in data:
    data = data.replace(old, new)
    print("Removed orphan catch")
else:
    print("Catch not found")
    idx = data.find(b'catch(e){ctx.globalAlpha')
    if idx >= 0:
        print(f"Found at {idx}: {data[idx:idx+100]}")

with open('card.html', 'wb') as f:
    f.write(data)

m = re.search(rb'<script>(.*?)</script>', data, re.DOTALL)
with open('_tc.js', 'wb') as out:
    out.write(m.group(1))
r = subprocess.run(['node', '--check', '_tc.js'], capture_output=True, text=True)
print("JS OK" if r.returncode == 0 else f"Error: {r.stderr[:150]}")
os.remove('_tc.js')
