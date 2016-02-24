#!/usr/bin/env python

import sys
import json
from html import HTML

data = {}
with open(sys.argv[1], "r") as f:
    data = json.loads(f.read())

h = HTML()
table = h.table(border='1')
r = table.tr
for i in range(0, len(data['columns'])):
    r.td(data['columns'][i])
for i in range(0, len(data['data'])):
    r = table.tr
    for j in range(0, len(data['data'][i])):
        r.td(data['data'][i][j])

with open(sys.argv[2], "w") as f:
    f.write(str(h))

sys.exit(0)