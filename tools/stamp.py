#!/usr/bin/env python3
"""Cache-buster: stamp every code file's imports (and index.html's script tag) with ?v=<version>,
so phones always fetch the newest game code after an update instead of an old saved copy.
Run before each release:  python3 tools/stamp.py"""
import re, glob, time, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
v = time.strftime('%Y%m%d%H%M%S')
spec = re.compile(r"""((?:from|import)\s*\(?\s*['"])(\.{1,2}/[^'"?]+\.js)(?:\?v=\d+)?(['"])""")
for f in glob.glob('src/**/*.js', recursive=True):
    s = open(f).read(); n = spec.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={v}{m.group(3)}", s)
    if n != s: open(f, 'w').write(n)
h = open('index.html').read()
h = re.sub(r'src="src/main\.js(?:\?v=\d+)?"', f'src="src/main.js?v={v}"', h)
open('index.html', 'w').write(h)
print('stamped', v)
