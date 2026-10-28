import json,sys
lib=open(sys.argv[1],encoding='utf-8').read()
src=open('widget.src.js',encoding='utf-8').read()
open('echarts-probe.js','w',encoding='utf-8').write("(function () {\n'use strict';\n"+lib+"\n__ECH = __ECH.default;\n"+src+"\n})();\n")
