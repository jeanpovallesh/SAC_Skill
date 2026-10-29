---
description: Prepara el prompt para obtener la metadata de un modelo de SAC
argument-hint: <ID del modelo>
---

Usa el skill **SAC_HTML_STORIES_SKILL** (carpeta del skill: normalmente `~/.claude/skills/SAC_HTML_STORIES_SKILL`; los scripts se ejecutan con `python3 -I`). Lee su `SKILL.md` antes de empezar y respeta su precedencia y las decisiones D1–D11.

Argumento recibido: `$ARGUMENTS` (ID del modelo de SAC). Si está vacío, pídelo.

1. Ejecuta `scripts/make_metadata_prompt.py $ARGUMENTS --out prompt.md`.
2. Explica en dos líneas cómo usar el `prompt.md` (pegarlo en Claude Code con el MCP de SAC activo) y que producirá `model-metadata-<ID>.json`.
3. Si el usuario ya tiene el JSON, ofrece correr `/sac-validar`.
