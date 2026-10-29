---
description: Genera los tres archivos del widget desde la especificación confirmada y los valida
argument-hint: [ruta a spec.json] [ruta a la metadata] [--base-url URL]
---

Usa el skill **SAC_HTML_STORIES_SKILL** (carpeta del skill: normalmente `~/.claude/skills/SAC_HTML_STORIES_SKILL`; los scripts se ejecutan con `python3 -I`). Lee su `SKILL.md` antes de empezar y respeta su precedencia y las decisiones D1–D11.

Argumentos: `$ARGUMENTS`. Si faltan la especificación o la metadata, usa las de esta conversación; si no existen, pídelas o sugiere `/sac-tablero`.

1. Ejecuta `scripts/generate_widget.py <spec.json> <metadata.json> --out <carpeta> [--base-url ...]`.
2. Valida con `scripts/validate_bundle.py <tag>.json <tag>.js <tag>_styling.js --spec <spec.json>`. Si falla, corrige la especificación y regenera; no parchees los archivos.
3. Corre la auditoría de diseño (`/sac-auditar`) antes de entregar.
4. Entrega según la sección 6 del `SKILL.md`: los tres archivos, la nota de instalación con el orden de feeds y los supuestos.
