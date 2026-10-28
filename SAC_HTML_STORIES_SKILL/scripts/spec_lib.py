"""Funciones compartidas por el validador de especificación y el generador."""
import re

TEXT_KEYS = ('label', 'labels', 'text', 'message', 'footer', 'note', 'caption')
IDENT = re.compile(r'^[A-Za-z][A-Za-z0-9_]*$')


def derived_properties(spec):
    """Propiedades editables que el generador agrega a las declaradas en la especificación (regla S12).

    Todo texto visible fijo de la especificación (título de componente, etiqueta de filtro,
    textos de `options`) es el valor por defecto de una propiedad editable en el panel de styling.
    Los textos que salen de datos (miembros, medidas) no son propiedades.
    """
    out = []
    feeds = {f['ref']: f for f in spec.get('feeds', [])}
    for c in spec.get('components', []):
        cid = c.get('id')
        if isinstance(c.get('title'), str) and c['title'].strip():
            out.append({'id': f'titulo_{cid}', 'type': 'string', 'default': c['title'],
                        'label': f'Título: {c["title"]}', 'appliesTo': f'{cid}.title', 'derived': True})
        for k, v in (c.get('options') or {}).items():
            if k in TEXT_KEYS and isinstance(v, str) and v.strip():
                out.append({'id': f'texto_{cid}_{k}', 'type': 'string', 'default': v,
                            'label': f'Texto ({k}) de {cid}', 'appliesTo': f'{cid}.options.{k}', 'derived': True})
    for fl in spec.get('filters', []) or []:
        fid, tgt = fl.get('id'), fl.get('target')
        label = fl.get('label') or feeds.get(tgt, {}).get('label') or tgt
        out.append({'id': f'etiqueta_{fid}', 'type': 'string', 'default': label,
                    'label': f'Etiqueta del filtro {label}', 'appliesTo': f'{fid}.label', 'derived': True})
    declared = {p['id'] for p in spec.get('properties', []) or []}
    if any((f.get('hierarchy') or {}).get('selectable') for f in feeds.values()) and 'nivelExpansionInicial' not in declared:
        out.append({'id': 'nivelExpansionInicial', 'type': 'integer', 'default': 1,
                    'label': 'Nivel de jerarquía inicial', 'appliesTo': 'tablas jerárquicas', 'derived': True})
    return out


def all_properties(spec):
    """Declaradas + derivadas (en ese orden)."""
    return list(spec.get('properties', []) or []) + derived_properties(spec)
