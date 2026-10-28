#!/usr/bin/env python3
"""Genera el prompt para pedir, con Claude Code y el MCP de SAC, la metadata de un modelo en el formato canónico.
Uso: python3 -I scripts/make_metadata_prompt.py <ID_DEL_MODELO> [--out archivo.md]"""
import argparse, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(HERE, '..', 'prompts', 'prompt-metadata-modelo.template.md')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('model_id')
    ap.add_argument('--out')
    a = ap.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_.\-]{3,80}', a.model_id):
        print('El ID del modelo solo puede tener letras, números, _, . y -', file=sys.stderr)
        return 2
    txt = open(TPL, encoding='utf-8').read().replace('{{MODEL_ID}}', a.model_id)
    if a.out:
        open(a.out, 'w', encoding='utf-8').write(txt)
        print('Prompt escrito en', a.out)
    else:
        print(txt)
    return 0


if __name__ == '__main__':
    sys.exit(main())
