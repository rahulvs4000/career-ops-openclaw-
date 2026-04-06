# Modo: pipeline - Inbox de URLs y mantenimiento de cola

Usa este modo para registrar, verificar y organizar URLs de ofertas en `data/pipeline.md`.

Si el usuario pega una o varias URLs sin subcomando, tratarlo como intake de `pipeline`.

## Workflow

1. Leer `data/pipeline.md` y tomar items `- [ ]` en la seccion `Pendientes`.
2. Si el usuario pego nuevas URLs en el mensaje actual:
   - normalizarlas
   - evitar duplicados contra `applications.md`, `scan-history.tsv` y `pipeline.md`
   - anadirlas a `Pendientes`
3. Para cada URL pendiente:
   - intentar verificar que siga activa
   - extraer empresa y rol cuando la pagina sea accesible
   - usar navegador primero para portales dinamicos; usar fetch solo como fallback seguro
   - si la URL es inaccesible o requiere login, marcar `- [!]` con una nota clara
4. Mover items verificados a `Procesadas` con el formato normalizado.
5. Mostrar resumen final con:
   - URLs recibidas
   - nuevas anadidas
   - duplicadas ignoradas
   - verificadas correctamente
   - inaccesibles o privadas

## Formato de `pipeline.md`

```markdown
## Pendientes
- [ ] 2026-04-06 | 84 | OpenAI | Forward Deployed Engineer | https://openai.com/careers/... | OpenAI careers
- [!] 2026-04-06 | private | Example Co | AI PM | https://private.url/job | login required

## Procesadas
- [x] 2026-04-06 | 84 | OpenAI | Forward Deployed Engineer | https://openai.com/careers/... | active
```

El primer campo es `found_on`. El segundo es el score de relevancia usado para decidir si el rol fue suficientemente fuerte para enviarse.

## Verificacion de URLs

Orden recomendado:

1. Browser snapshot para portales dinamicos
2. WebFetch para paginas estaticas

Casos especiales:

- LinkedIn puede requerir login; si no hay sesion valida, anotar el bloqueo
- `local:` prefix sigue apuntando a archivos `jds/...` cuando el usuario guarda una copia manual del JD
- nunca asumir que una pagina privada sigue activa solo porque la URL responde
