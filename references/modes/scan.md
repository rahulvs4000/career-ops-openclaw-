# Modo: scan - Portal Scanner (Descubrimiento, scoring y delivery)

Escanea portales configurados de forma deterministica, puntua relevancia, elimina duplicados, guarda solo roles nuevos de alta relevancia y los devuelve como digest para que OpenClaw los envie por el canal ya configurado en la sesion.

## Configuracion

Leer:
- `portals.yml`
- `config/profile.yml`
- `data/scan-history.tsv`
- `data/applications.md`
- `data/pipeline.md`

## Ejecucion escalable

No leer cientos o miles de career pages dentro del contexto del modelo.

Para scans grandes, ejecutar siempre el flujo en dos pasos:

```bash
node scripts/scan-sources.mjs --project-root . --output ./data/scan-candidates.json
node scripts/process-scan-results.mjs --project-root . --input ./data/scan-candidates.json
```

`scan-sources.mjs` hace el trabajo pesado de discovery:
- recorre `search_queries`
- recorre `tracked_companies`
- usa concurrencia limitada
- consulta Greenhouse API cuando existe
- usa Playwright para páginas de careers dinámicas
- usa web search para entradas marcadas como `scan_method: websearch`
- escribe un JSON normalizado con los candidatos

`process-scan-results.mjs` hace la segunda mitad:
- dedup contra `scan-history.tsv`, `pipeline.md` y `applications.md`
- scoring con `config/profile.yml` + `portals.yml`
- filtra por `minimum_relevance_score`
- guarda `found_on` y score en `pipeline.md`
- registra todo en `scan-history.tsv`
- devuelve un digest final con solo los roles nuevos y suficientemente relevantes

Despues, enviar ese digest por el canal ya configurado en OpenClaw para el usuario actual.

## Reglas de relevancia

- Un rol debe parecer alineado con los roles objetivo del usuario o con keywords positivas del filtro.
- Si el titulo contiene keywords negativas, se descarta.
- Si queda por debajo del threshold configurado, se registra como `skipped_score` y no se entrega.
- Si ya existe en historial, pipeline o tracker, se registra como `skipped_dup` y no se entrega.

## Resumen al usuario

Mostrar siempre un resumen final con:
- resultados extraidos
- duplicados descartados
- roles por debajo del threshold
- nuevos roles entregados
- si no hubo resultados nuevos, decirlo explicitamente

## Private URLs

URLs privadas o no accesibles:
- no entregarlas como hallazgos validos
- si el usuario quiere conservarlas, guardarlas en `jds/<slug>.md` y referenciarlas como `local:jds/...`
- marcar el historial con estado claro en vez de fingir acceso
