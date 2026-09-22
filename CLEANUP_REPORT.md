# Reporte de Limpieza del Repositorio

## Resumen

Se revisó el directorio completo del proyecto. No se eliminaron archivos automáticamente (acción bloqueada por permisos de seguridad para evitar pérdida de datos). Se actualizó el `.gitignore` y se identifican los archivos a eliminar manualmente.

---

## Archivos a eliminar manualmente (requieren acción del usuario)

Estos archivos están siendo **trackeados por git** pero no deberían estar en el repositorio. Ejecutar los comandos de abajo para removerlos:

```bash
# Desde la raíz del proyecto:

# 1. SQLite (legado — el proyecto usa MySQL)
git rm --cached backend/tele_import.db backend/tele_import.db-shm backend/tele_import.db-wal
del backend\tele_import.db backend\tele_import.db-shm backend\tele_import.db-wal

# 2. Scripts de desarrollo puntual
git rm --cached backend/check_sort.ts backend/sort_result.txt
del backend\check_sort.ts backend\sort_result.txt

# 3. Texto extraído de la tesis (archivo temporal)
git rm --cached tesis_text.txt
del tesis_text.txt

# 4. Borrador de tesis (draft personal, no código)
git rm --cached "tesis recortada.docx"
del "tesis recortada.docx"
```

### Scripts de generación de documentos (decisión del usuario)

Los siguientes archivos generan los `.docx` de la tesis y están trackeados pero son scripts de uso puntual, no código del proyecto:

- `gen_cap3.js`
- `gen_cap6.js`
- `gen_diagramas.js`
- `gen_diccionario.js`
- `gen_matriz.js`

Si ya no se necesitan (los `.docx` ya están generados), eliminar con:
```bash
git rm --cached gen_cap3.js gen_cap6.js gen_diagramas.js gen_diccionario.js gen_matriz.js
del gen_cap3.js gen_cap6.js gen_diagramas.js gen_diccionario.js gen_matriz.js
```

---

## Archivos grandes / inusuales que revisar antes de pushear

| Archivo | Tamaño | Nota |
|---|---|---|
| `frontend/node_modules/` | ~348 MB | Correctamente ignorado por git |
| `backend/node_modules/` | ~45 MB | Correctamente ignorado por git |
| `frontend/.next/` | ~65 MB | Correctamente ignorado por git |
| `backend/dist/` | ~0.2 MB | Correctamente ignorado por git |
| `node_modules/` (raíz) | ~8 MB | Para scripts gen_*.js — ignorado por git |
| `tesis_unpacked/` | ~1.5 MB | Carpeta con el .docx descomprimido — NO trackeada, agregada al .gitignore |
| `Capitulo3_Mandato.docx` | 12 KB | Documentación de tesis — trackeada, puede quedarse si es intencional |
| `Capitulo6_Diseno.docx` | 26 KB | Documentación de tesis — trackeada, puede quedarse si es intencional |
| `Diccionario_de_Datos.docx` | 23 KB | Documentación de tesis — trackeada, puede quedarse si es intencional |
| `Matriz_Validacion.docx` | 15 KB | Documentación de tesis — trackeada, puede quedarse si es intencional |

---

## Cambios aplicados al `.gitignore`

Se agregaron las siguientes entradas al `.gitignore` raíz:

```gitignore
# SQLite (legacy - proyecto migrado a MySQL)
*.db
*.db-shm
*.db-wal

# Archivos temporales y de desarrollo puntual
tesis_text.txt
tesis_unpacked/
backend/check_sort.ts
backend/sort_result.txt

# Scripts locales de generación de documentos Word
gen_cap*.js
gen_diccionario.js
gen_diagramas.js
gen_matriz.js
```

---

## Estado del `.gitignore` — Verificado ✓

Los siguientes directorios grandes están correctamente ignorados:
- ✅ `node_modules/` (raíz, backend y frontend)
- ✅ `backend/dist/`
- ✅ `frontend/.next/`
- ✅ `.env` y `.env.*` (excepto `.env.example`)
- ✅ `*.log`

**No existen** `.gitignore` separados en `backend/` ni `frontend/` — todo se maneja desde la raíz, lo cual es válido para un monorepo.

---

## Próximo paso recomendado

Ejecutar los comandos de eliminación de la sección anterior, luego hacer commit:

```bash
git add .gitignore CLEANUP_REPORT.md
git commit -m "chore: clean up gitignore and remove legacy/temp files"
```
