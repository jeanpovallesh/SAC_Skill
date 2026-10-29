---
description: Audita el diseño de un widget generado (contraste, desbordes, foco, accesibilidad, movimiento reducido)
argument-hint: <ruta al <tag>.js> <ruta a spec.json> [carpeta de salida]
---

Usa el skill **SAC_HTML_STORIES_SKILL** (carpeta del skill: normalmente `~/.claude/skills/SAC_HTML_STORIES_SKILL`; los scripts se ejecutan con `python3 -I`). Lee su `SKILL.md` antes de empezar y respeta su precedencia y las decisiones D1–D11.

Argumentos: `$ARGUMENTS`. Si faltan, usa el último widget generado en esta conversación.

1. Ejecuta `scripts/audit_design.py <tag>.js <spec.json> --out <carpeta>`.
2. Presenta los fallos (F) y avisos (A) agrupados. Un fallo se corrige en la especificación o el `theme` y se regenera; un aviso se declara como supuesto.
3. Mira las capturas de 320, 600 y 900 px para lo que no se mide (un color por miembro, variaciones, jerarquía; `references/design-guidelines.md` §9) y resume el veredicto en pocas líneas.
