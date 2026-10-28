# Se ejecuta desde test_validators.py (comparte check, ROOT, vb, json, copy, os)
_pdir = os.path.join(ROOT, 'probe')
_man = json.load(open(os.path.join(_pdir, 'sac-probe.json'), encoding='utf-8'))
_main = open(os.path.join(_pdir, 'sac-probe.js'), encoding='utf-8').read()
_sty = open(os.path.join(_pdir, 'sac-probe_styling.js'), encoding='utf-8').read()
_names = {'main': 'sac-probe.js', 'styling': 'sac-probe_styling.js'}

# la sonda devuelve un objeto a propósito (getProbeObject): es el caso R5 real
_e, _w = vb.validate(_man, _main, _sty, _names)
check('paquete: la sonda real marca solo R5 getProbeObject', [x for x in _e if not x.startswith('R5 getProbeObject')] == [])

_good_main = _main.replace('return { build: BUILD, renders: this._renders, ok: true };',
                           'return JSON.stringify({ build: BUILD, renders: this._renders, ok: true });')
_e, _w = vb.validate(_man, _good_main, _sty, _names)
check('paquete base corregido: sin errores', _e == [])


def neg_bundle(name, rule, man=None, main=None, sty=None, names=None):
    m = copy.deepcopy(_man)
    if man:
        man(m)
    e, w = vb.validate(m, main(_good_main) if main else _good_main, sty(_sty) if sty else _sty, names or _names)
    check(f'paquete {name} -> {rule}', any(x.startswith(rule) for x in e + w))


neg_bundle('tag distinto', 'R1', man=lambda m: m['webcomponents'][0].__setitem__('tag', 'com-otro-widget'))
neg_bundle('tag styling distinto', 'R2', man=lambda m: m['webcomponents'][1].__setitem__('tag', 'com-isitec-otro-styling'))
neg_bundle('tag con versión', 'R3', man=lambda m: m['webcomponents'][0].__setitem__('tag', 'com-isitec-sacprobe-v3'))
neg_bundle('método inexistente', 'R4', man=lambda m: m['methods'].__setitem__('noExiste', {'returnType': 'string', 'description': 'x'}))
neg_bundle('returnType objeto', 'R5', man=lambda m: m['methods']['getProbeBuild'].__setitem__('returnType', 'object'))
neg_bundle('método devuelve objeto', 'R5', main=lambda j: j.replace('getProbeBuild() { return BUILD; }', 'getProbeBuild() { return { b: BUILD }; }'))
neg_bundle('método async', 'R5', main=lambda j: j.replace('getProbeBuild() {', 'async getProbeBuild() {'))
neg_bundle('evento sin disparar', 'R6', man=lambda m: m['events'].__setitem__('onNunca', {'description': 'x'}))
neg_bundle('propiedad sin uso', 'R7', man=lambda m: m['properties'].__setitem__('fantasma', {'type': 'string', 'description': 'x', 'default': ''}))
neg_bundle('styling sin setter', 'R8', sty=lambda s: s.replace('set maxRows(', 'set maxRowsX('))
neg_bundle('setter de propiedad no declarada', 'R9', sty=lambda s: s.replace('set maxRows(', 'set maxRowsX('))
neg_bundle('binding con otro nombre', 'R10', man=lambda m: m['dataBindings'].__setitem__('otroBinding', m['dataBindings'].pop('myDataBinding')))
neg_bundle('columna de feed no declarado', 'R11', main=lambda j: j.replace('(function () {', "(function () { var _x = 'ghost_0'; var dimensions_3 = 1;", 1) if 'dimensions_3' not in j else j,
           man=lambda m: [f for f in m['dataBindings']['myDataBinding']['feeds'] if f['id'] == 'dims'] and m['dataBindings']['myDataBinding']['feeds'].pop(0) and None)
neg_bundle('url sin https', 'R12', man=lambda m: m['webcomponents'][0].__setitem__('url', 'http://x.com/sac-probe.js'))
neg_bundle('falta id', 'R12', man=lambda m: m.pop('id'))
neg_bundle('archivo con otro nombre', 'R13', names={'main': 'otro.js', 'styling': 'sac-probe_styling.js'})
neg_bundle('innerHTML sin escape', 'R14', main=lambda j: j.replace('(function () {', "(function () { var f = function (d) { document.body.innerHTML = `<b>${d.label}</b>`; };", 1))
neg_bundle('recurso externo', 'R-EXT', main=lambda j: j.replace('<style>', '<style>@import url(https://fonts.googleapis.com/css2?family=Inter);', 1))
neg_bundle('sin IIFE', 'R-IIFE', main=lambda j: 'var x = 1;\n' + j)
neg_bundle('sin shadow DOM', 'R-SHADOW', main=lambda j: j.replace('attachShadow', 'noShadow'))
neg_bundle('setHierarchy sin typeof', 'C17', main=lambda j: j.replace('(function () {', "(function () { var ds = {}; ds.setHierarchy('Entidad', 'x');", 1))
