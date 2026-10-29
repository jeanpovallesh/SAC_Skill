---
description: Valida el JSON de metadata del modelo (M1–M18 y esquema)
argument-hint: <ruta al model-metadata.json>
---

Usa el skill **SAC_HTML_STORIES_SKILL** (carpeta del skill: normalmente `~/.claude/skills/SAC_HTML_STORIES_SKILL`; los scripts se ejecutan con `python3 -I`). Lee su `SKILL.md` antes de empezar y respeta su precedencia y las decisiones D1–D11.

Argumento recibido: `$ARGUMENTS` (ruta al JSON). Si está vacío, pídela.

1. Ejecuta `scripts/validate_model_json.py $ARGUMENTS`.
2. Resume el resultado: reglas ejecutadas, errores y avisos. Si hay errores, detente y explica qué corregir o si conviene regenerar la metadata (`/sac-metadata`).
