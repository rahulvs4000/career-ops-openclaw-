# Modo: pdf - Generacion de PDF ATS-Optimizado

## Pipeline completo

1. Leer `cv.md`, `config/profile.yml` y `article-digest.md` si existe.
2. Preguntar si el usuario quiere:
   - un PDF general
   - un PDF adaptado a una empresa o rol concreto
3. Si hay contexto de rol:
   - extraer 15-20 keywords utiles
   - detectar idioma y ajustar el contenido
   - adaptar summary, proyectos y orden de bullets con base en experiencia real
4. Si no hay contexto de rol:
   - generar una version general usando los roles objetivo y la narrativa guardada en `profile.yml`
5. Detectar formato papel:
   - US/Canada -> `letter`
   - resto del mundo -> `a4`
6. Generar HTML completo desde template + contenido personalizado
7. Escribir HTML a `/tmp/cv-candidate-{company-or-general}.html`
8. Ejecutar: `node generate-pdf.mjs /tmp/cv-candidate-{company-or-general}.html output/cv-candidate-{company-or-general}-{YYYY-MM-DD}.pdf --format={letter|a4}`
9. Reportar ruta del PDF, numero de paginas y, si hubo contexto de rol, cobertura aproximada de keywords

## Reglas ATS (parseo limpio)

- Layout single-column (sin sidebars, sin columnas paralelas)
- Headers estandar: "Professional Summary", "Work Experience", "Education", "Skills", "Certifications", "Projects"
- Sin texto en imagenes/SVGs
- Sin info critica en headers/footers del PDF (ATS los ignora)
- UTF-8, texto seleccionable (no rasterizado)
- Sin tablas anidadas
- Keywords del rol distribuidas: Summary, primeros bullets, Skills section

## Diseno del PDF

- **Fonts**: Space Grotesk (headings, 600-700) + DM Sans (body, 400-500)
- **Fonts self-hosted**: `fonts/`
- **Header**: nombre en Space Grotesk 24px bold + linea gradiente + fila de contacto
- **Section headers**: Space Grotesk 13px, uppercase, letter-spacing 0.05em, color cyan primary
- **Body**: DM Sans 11px, line-height 1.5
- **Company names**: color accent purple
- **Margenes**: 0.6in
- **Background**: blanco puro

## Orden de secciones

1. Header
2. Professional Summary
3. Core Competencies
4. Work Experience
5. Projects
6. Education & Certifications
7. Skills

## Estrategia de keyword injection (etico, basado en verdad)

Ejemplos de reformulacion legitima:
- el rol dice "RAG pipelines" y el CV dice "LLM workflows with retrieval" -> cambiar a "RAG pipeline design and LLM orchestration workflows"
- el rol dice "MLOps" y el CV dice "observability, evals, error handling" -> cambiar a "MLOps and observability: evals, error handling, cost monitoring"
- el rol dice "stakeholder management" y el CV dice "collaborated with team" -> cambiar a "stakeholder management across engineering, operations, and business"

**NUNCA anadir skills que el candidato no tiene. Solo reformular experiencia real con el vocabulario exacto del rol.**

## Template HTML

Usar el template en `cv-template.html`. Reemplazar los placeholders `{{...}}` con contenido personalizado:

| Placeholder | Contenido |
|-------------|-----------|
| `{{LANG}}` | `en` o `es` |
| `{{PAGE_WIDTH}}` | `8.5in` (letter) o `210mm` (A4) |
| `{{NAME}}` | (from profile.yml) |
| `{{EMAIL}}` | (from profile.yml) |
| `{{LINKEDIN_URL}}` | [from profile.yml] |
| `{{LINKEDIN_DISPLAY}}` | [from profile.yml] |
| `{{PORTFOLIO_URL}}` | [from profile.yml] |
| `{{PORTFOLIO_DISPLAY}}` | [from profile.yml] |
| `{{LOCATION}}` | [from profile.yml] |
| `{{SECTION_SUMMARY}}` | Professional Summary / Resumen Profesional |
| `{{SUMMARY_TEXT}}` | Summary personalizado |
| `{{SECTION_COMPETENCIES}}` | Core Competencies / Competencias Core |
| `{{COMPETENCIES}}` | `<span class="competency-tag">keyword</span>` x 6-8 |
| `{{SECTION_EXPERIENCE}}` | Work Experience / Experiencia Laboral |
| `{{EXPERIENCE}}` | HTML de cada trabajo con bullets reordenados |
| `{{SECTION_PROJECTS}}` | Projects / Proyectos |
| `{{PROJECTS}}` | HTML de top 3-4 proyectos |
| `{{SECTION_EDUCATION}}` | Education / Formacion |
| `{{EDUCATION}}` | HTML de educacion |
| `{{SECTION_CERTIFICATIONS}}` | Certifications / Certificaciones |
| `{{CERTIFICATIONS}}` | HTML de certificaciones |
| `{{SECTION_SKILLS}}` | Skills / Competencias |
| `{{SKILLS}}` | HTML de skills |

## Post-generacion

Si la oportunidad ya existe en `data/applications.md`, actualizar la columna PDF a `OK`.
