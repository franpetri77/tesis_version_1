// =============================================
// OPTIMIZACION DE IMAGENES ESTATICAS
// Redimensiona y recomprime las imagenes de public/img.
//
// Los banners originales llegaban a 5778 px de ancho y 3,8 MB, cuando
// se muestran a lo sumo a 1920 px. Este script los deja en un tamano
// acorde y genera ademas una version WebP, notablemente mas liviana.
//
// Uso:
//   npm run optimizar-imagenes
//
// Los originales se conservan en public/img/originales/ por si hace
// falta regenerar con otros parametros.
// =============================================

import sharp from "sharp";
import { readdir, mkdir, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_IMG = path.join(__dirname, "..", "public", "img");
const DIR_ORIG = path.join(DIR_IMG, "originales");

const ANCHO_MAX = 1920;
const CALIDAD_JPEG = 82;
const CALIDAD_WEBP = 80;

const kb = (bytes) => Math.round(bytes / 1024);

async function main() {
  if (!existsSync(DIR_ORIG)) await mkdir(DIR_ORIG, { recursive: true });

  const archivos = (await readdir(DIR_IMG)).filter((f) => /\.(jpe?g|png)$/i.test(f));

  if (archivos.length === 0) {
    console.log("No se encontraron imagenes para optimizar.");
    return;
  }

  let antes = 0;
  let despues = 0;

  for (const archivo of archivos) {
    const origen = path.join(DIR_IMG, archivo);
    const respaldo = path.join(DIR_ORIG, archivo);

    // Se respalda una sola vez: si ya existe, el original ya fue guardado
    // en una corrida previa y no debe sobrescribirse con la version optimizada.
    if (!existsSync(respaldo)) await copyFile(origen, respaldo);

    const pesoAntes = (await stat(respaldo)).size;
    const meta = await sharp(respaldo).metadata();

    const base = sharp(respaldo).resize({
      width: Math.min(ANCHO_MAX, meta.width ?? ANCHO_MAX),
      withoutEnlargement: true,
    });

    // Sobrescribe el archivo original ya optimizado
    const buffer = await base
      .clone()
      .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
      .toBuffer();
    await sharp(buffer).toFile(origen);

    // Version WebP junto al archivo, para quien quiera usarla
    const salidaWebp = origen.replace(/\.(jpe?g|png)$/i, ".webp");
    await base.clone().webp({ quality: CALIDAD_WEBP }).toFile(salidaWebp);

    const pesoDespues = (await stat(origen)).size;
    const pesoWebp = (await stat(salidaWebp)).size;

    antes += pesoAntes;
    despues += pesoDespues;

    console.log(
      `${archivo.padEnd(26)} ${String(kb(pesoAntes) + " KB").padStart(9)} -> ` +
      `${String(kb(pesoDespues) + " KB").padStart(8)}  (webp: ${kb(pesoWebp)} KB)  ` +
      `${meta.width}x${meta.height}`
    );
  }

  const ahorro = (((antes - despues) / antes) * 100).toFixed(0);
  console.log(`\nTotal: ${kb(antes)} KB -> ${kb(despues)} KB  (${ahorro}% menos)`);
  console.log(`Originales conservados en public/img/originales/`);
}

main().catch((err) => {
  console.error("Error al optimizar imagenes:", err);
  process.exit(1);
});
