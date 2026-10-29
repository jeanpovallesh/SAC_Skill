---
description: Interpreta un pedido de tablero y propone la especificación (sin generar todavía)
argument-hint: <descripción del tablero> [ruta a la metadata]
---

Usa el skill **SAC_HTML_STORIES_SKILL** (carpeta del skill: normalmente `~/.claude/skills/SAC_HTML_STORIES_SKILL`; los scripts se ejecutan con `python3 -I`). Lee su `SKILL.md` antes de empezar y respeta su precedencia y las decisiones D1–D11.

Pedido del usuario: `$ARGUMENTS`.

Sigue los pasos 1–4 del flujo del `SKILL.md`: validar la metadata, interpretar el pedido (`references/intent-interpretation.md`), escribir la especificación y validarla con `scripts/validate_spec.py`, y mostrar el resumen (feeds, medidas, componentes, filtros D11, supuestos y preguntas abiertas). **No generes nada hasta que el usuario confirme**; al confirmar, sugiere `/sac-generar`.
