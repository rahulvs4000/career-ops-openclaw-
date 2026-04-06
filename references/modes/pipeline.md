# Modo: pipeline — Inbox de URLs (Second Brain)

Procesa URLs de ofertas acumuladas en `data/pipeline.md`. El usuario añade URLs; luego ejecuta `/career-ops pipeline` para procesarlas.

## Workflow

1. Leer `data/pipeline.md` y tomar items `- [ ]` en sección `Pendientes`.
2. Para cada URL pendiente:
   a. Calcular siguiente `REPORT_NUM` secuencial leyendo `reports/`.
   b. Extraer JD con prioridad:
      - Playwright-like browser snapshot (`browser` tool or equivalent)
      - WebFetch
      - WebSearch
   c. Si la URL es inaccesible: marcar `- [!]` con nota y continuar.
   d. Ejecutar `auto-pipeline` (evaluación A-F, report, PDF cuando aplique, tracker).
   e. Mover a `Procesadas`: `- [x] #NNN | URL | Empresa | Rol | Score/5 | PDF ✓/✗`.
3. Si hay muchas URLs pendientes, parallelizar workers con límites de estabilidad del entorno de navegación.
4. Al finalizar mostrar resumen:

```text
| # | Empresa | Rol | Score | PDF | Acción recomendada |
```

## Formato de `pipeline.md`

```markdown
## Pendientes
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job — Error: login required

## Procesadas
- [x] #143 | https://jobs.example.com/posting/789 | Acme Corp | AI PM | 4.2/5 | PDF ✓
```

## Detección de JD desde URL

1. Browser snapshot
2. WebFetch fallback
3. WebSearch final

Casos especiales:

- LinkedIn: puede requerir login, entonces anotar error y pedir JD manual.
- PDF: leer `PDF` con herramienta de lectura disponible.
- `local:` prefix: `local:...` hace referencia a archivo `jds/...`.

## Numeración automática

1. Leer archivos en `reports/`.
2. Extraer prefijo numérico (`###`).
3. Siguiente número = máximo + 1.

## Sincronización previa

Antes de procesar:

```bash
node scripts/cv-sync-check.mjs
```

Si hay desajustes, advertir y continuar con cautela.
