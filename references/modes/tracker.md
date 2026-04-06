# Modo: tracker - Tracker de Aplicaciones

Lee y muestra `data/applications.md`.

**Formato compatible del tracker:**
```markdown
| # | Fecha | Empresa | Rol | Score | Estado | PDF | Report |
```

Las columnas `PDF` y `Report` pueden quedar vacias. Se mantienen por compatibilidad con trackers existentes.

Estados posibles: `Evaluada` -> `Aplicado` -> `Respondido` -> `Contacto` -> `Entrevista` -> `Oferta` / `Rechazada` / `Descartada` / `NO APLICAR`

- `Aplicado` = el candidato envio su candidatura
- `Respondido` = un recruiter o empresa contacto y el candidato respondio
- `Contacto` = el candidato contacto proactivamente a alguien de la empresa

Si el usuario pide actualizar un estado, editar la fila correspondiente.

Mostrar tambien estadisticas:
- Total de aplicaciones
- Por estado
