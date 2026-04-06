# Modo: batch — Procesamiento Masivo de Ofertas

Dos modos de uso: **conductor con navegador** (portal + DOM en vivo) o **standalone** (script para URLs pre-cargadas).

## Arquitectura

```text
OpenClaw Conductor (orchestrador)
  ├─ Browser: abre portales (sesión del operador), ve los cambios en tiempo real
  ├─ Extrae ofertas y URLs
  ├─ Para cada oferta, lanza un worker con contexto aislado
  ├─ Consolida tracker-lines generadas por workers
  └─ Ejecuta merge-tracker al terminar
```

Cada worker debe ejecutar el mismo núcleo de flujo que `auto-pipeline`:
- evaluar (A-F),
- generar report,
- opcionalmente PDF,
- crear línea de tracker en `batch/tracker-additions/<id>-*.tsv`.

## Archivos de estado

- `batch/batch-input.tsv`  
  URLs de entrada (`id`, `url`, `source`, `notes`)
- `batch/batch-state.tsv`  
  Estado y reintentos para reanudación
- `batch/logs/<report>-<id>.log`
- `batch/tracker-additions/`  
  TSVs para merge posterior
- `batch/merged/`  
  Historial de files ya integrados (gestionado por script)

## Modo A: Conductor con navegador

1. Cargar estado desde `batch/batch-state.tsv`.
2. Navegar portal y extraer lista de URLs.
3. Para cada URL pendiente:
   a. Guardar JD a `/tmp/batch-jd-<id>.txt` (o ruta del sistema).
   b. Calcular siguiente número de report.
   c. Invocar worker command configurable con `batch/batch-prompt.md`.
   d. Actualizar estado (`pending/processing/completed/failed`).
4. Si falla un item, registrar error y continuar.
5. Al finalizar, ejecutar merge de tracker.

## Modo B: Script standalone

`batch/batch-runner.sh [--options]`

Opciones:
- `--dry-run` — listar pendientes sin ejecutar
- `--retry-failed` — rehacer solo fallidas
- `--start-from N` — saltar IDs previos
- `--parallel N` — workers simultáneos
- `--max-retries N` — máximo reintentos por item

### Formato de `batch-state.tsv`

```text
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	pending	-	-	-	-	-	0
2	https://...	completed	2026-...	2026-...	002	4.2	-	0
```

## Workers

`batch/batch-runner.sh` espera un comando worker configurable. Definirlo en entorno:

```bash
export CAREER_OPS_BATCH_WORKER_COMMAND="/path/to/worker-command"
```

El comando debe aceptar el texto del prompt como primer argumento.

Si el hook no está configurado, el runner deja el trabajo en estado `failed` y reporta claramente la acción pendiente.

## Salida esperada del worker

1. `reports/<###>-<slug>-<fecha>.md`
2. `output/<...>.pdf` (si aplica)
3. `batch/tracker-additions/<id>-<slug>.tsv`
4. `status` JSON/linea por output (si aplica)

## Errores y reintentos

- URL inaccesible: error + continuar.
- JD tras login/SSO: marcar fail + retry manual.
- Portal con layout nuevo: fallos parciales, retry con backoff.
- `--retry-failed` permite reintentar respetando `--max-retries`.

## Integridad final

Tras procesar, correr:

```bash
node scripts/merge-tracker.mjs
node scripts/verify-pipeline.mjs
```

para obtener `applications.md` limpio y consistente.
