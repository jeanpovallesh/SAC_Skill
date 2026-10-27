import json, re, sys, collections
E = {'mt':{'planning','analytic'},'dt':{'version','time','account','category','organization','generic'},
 'unit':{'currency','unit','number','percent'},'mty':{'fixed','variable'},'pt':{'string','number','date','boolean'},
 'kind':{'level','parent-child'},'agg':{'additive','semi-additive','non-additive'},'ta':{'last','avg'},'gd':{'up','down'}}
d = json.load(open(sys.argv[1], encoding='utf-8'))
errs, warns, info = [], [], []
for k in ('schema_version','model','dimensions','measures'):
    if k not in d: errs.append(f'M2 falta {k}')
m = d['model']
for k in ('id','name','type'):
    if not m.get(k): errs.append(f'M2 model.{k} vacío')
if m.get('type') not in E['mt']: errs.append('M3 model.type')
ids = [x['id'] for x in d['dimensions']] + [x['id'] for x in d['measures']]
dup = [i for i,c in collections.Counter(ids).items() if c>1]
if dup: errs.append(f'M4 ids duplicados dim/medida: {dup}')
cnt = collections.Counter(x['type'] for x in d['dimensions'])
for dim in d['dimensions']:
    did = dim['id']
    if dim.get('type') not in E['dt']: errs.append(f'M5 {did} type')
    pids = [p['id'] for p in dim.get('properties',[])]
    for p in dim.get('properties',[]):
        if p.get('type','string') not in E['pt']: errs.append(f'M7 {did}.{p["id"]} tipo prop')
    hs = dim.get('hierarchies',[])
    if len({h['id'] for h in hs}) != len(hs): errs.append(f'M4 hier dup {did}')
    df = [h for h in hs if h.get('default')]
    if len(df)>1: errs.append(f'M8 varias default {did}')
    if hs and not df: warns.append(f'M16 {did} sin default')
    for h in hs:
        if h.get('kind') not in E['kind']: warns.append(f'M16 {did}.{h["id"]} kind')
        if 'levels' in h and h.get('kind')!='level': errs.append(f'M8 levels sin kind level {did}')
    mem = dim.get('members',[])
    mids = [x['id'] for x in mem]
    dm = [i for i,c in collections.Counter(mids).items() if c>1]
    if dm: errs.append(f'M4 miembros duplicados {did}: {dm}')
    S = set(mids)
    par = {x['id']: x.get('parent_id') for x in mem}
    for x in mem:
        p = x.get('parent_id')
        if p and p not in S: errs.append(f'M9 padre inexistente {did}.{x["id"]} -> {p}')
        for pk in x.get('properties',{}):
            if pk not in pids: errs.append(f'M9b prop de miembro no declarada {did}.{x["id"]}.{pk}')
    for x in mid_iter if False else mids:  # ciclos
        seen=set(); c=x
        while c and c in par:
            if c in seen: errs.append(f'M9c ciclo en {did} en {x}'); break
            seen.add(c); c=par[c]
    if len(mem)>200: warns.append(f'M17 {did} members>200')
    if dim.get('ordered') and dim.get('type')!='time' and not mem: warns.append(f'M18 {did}')
    empty = sum(1 for x in mem if not (x.get('description') or '').strip())
    if empty: info.append(f'{did}: {empty}/{len(mem)} miembros sin descripción')
    roots = [x for x in mids if not par.get(x)]
    if len(roots)>1 and hs: info.append(f'{did}: {len(roots)} raíces en la jerarquía ({", ".join(roots[:8])}{"…" if len(roots)>8 else ""})')
    for pid in pids:
        if mem and not any(pid in x.get('properties',{}) for x in mem): info.append(f'{did}.{pid}: ningún miembro trae valor')
if cnt['time']==0: warns.append('M12 sin dimensión time')
if any(cnt[t]>1 for t in ('time','account','version')): warns.append('M13 duplicados de time/account/version')
mset = {x['id'] for x in d['measures']}
nulld = 0
for ms in d['measures']:
    if ms.get('unit') not in E['unit']: errs.append(f'M6 unit {ms["id"]}')
    if ms.get('type') not in E['mty']: errs.append(f'M6 type {ms["id"]}')
    if ms.get('type')=='fixed' and not ms.get('unit_value'): errs.append(f'M6 fixed sin unit_value {ms["id"]}')
    if ms.get('type')=='variable' and ms.get('unit_value') is not None: errs.append(f'M6 variable con unit_value {ms["id"]}')
    for f,k in (('aggregation','agg'),('time_aggregation','ta'),('good_direction','gd')):
        if f in ms and ms[f] not in E[k]: errs.append(f'M7 {f} {ms["id"]}')
    if ms.get('aggregation')=='semi-additive' and 'time_aggregation' not in ms: warns.append(f'M15 {ms["id"]}')
    c = ms.get('components')
    if c and (c.get('numerator') not in mset or c.get('denominator') not in mset): errs.append(f'M10 components {ms["id"]}')
    dec = ms.get('decimals')
    if dec is None: nulld += 1
    elif not (isinstance(dec,int) and 0<=dec<=6): errs.append(f'M11 decimals {ms["id"]}')
if nulld: info.append(f'decimals=null en {nulld} medidas (se tolera como "ausente")')
print('ERRORES:', errs or 'ninguno')
print('ADVERTENCIAS:', warns or 'ninguna')
print('INFO:'); [print(' -', i) for i in info]
print('dims', len(d['dimensions']), '| medidas', len(d['measures']))
