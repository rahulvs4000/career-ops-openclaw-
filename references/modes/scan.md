# Modo: scan — Portal Scanner (Descubrimiento de Ofertas)

Escanea portales configurados y añade nuevas ofertas a `data/pipeline.md`.

## Ejecución

Recomendada como sesión de trabajo separada (para aislar dependencias de navegador y mantener contexto).

## Configuración

Leer `portals.yml`:
- `search_queries`: consultas con `site:` por portal.
- `tracked_companies`: empresas con `careers_url`.
- `title_filter`: filtros de título (`positive`, `negative`, `seniority_boost`).

## Estrategia (3 niveles)

1. **Nivel 1 — Playwright/directo (principal)**  
   Para cada empresa con `careers_url`, navegar y extraer ofertas.
2. **Nivel 2 — Greenhouse API (complementario)**  
   Si existe `api`, consultar JSON público.
3. **Nivel 3 — WebSearch (descubrimiento amplio)**  
   Consultas de fallback para encontrar nuevas compañías.

## Flujo

1. Cargar `portals.yml`, `data/scan-history.tsv`, `data/applications.md`, `data/pipeline.md`.
2. Ejecutar niveles 1..3 según configuración.
3. Filtrar por `title_filter`.
4. Deduplicar contra:
   - historial de scan
   - `applications.md` (empresa+rol)
   - `pipeline.md` (pendientes/procesadas)
5. Insertar nuevas entradas en `pipeline.md` y registrar historial:
   - Nuevas: `... \t added`
   - Filtradas por título: `... \t skipped_title`
   - Duplicadas: `... \t skipped_dup`

## Extracción de título y empresa en resultados

Reglas:
- Si formato parece `"Job Title @ Company"` usar ese split.
- Si viene como `"Job Title | Company"` usar ese split.
- Patrones adicionales de portal:
  - Ashby, Greenhouse, Lever

## Private URLs

URLs privadas o no accesibles: guardar oferta en `jds/<slug>.md` y añadir en `pipeline.md` como `local:jds/...`.

## Resumen

Mostrar:

```text
Portal Scan — YYYY-MM-DD
Queries ejecutadas: N
Encontradas: N
Filtradas por título: N
Duplicadas: N
Nuevas en pipeline: N
```

## Gestión de `careers_url`

- Guardar siempre `careers_url` para empresas activas.
- Actualizar cuando expire/redirija.
- Ajustar filtros y queries para reducir ruido.
