// =============================================
// SEED ADICIONAL — Productos de prueba extra
// Agrega más productos a todas las categorías existentes
// para permitir un testing más completo del catálogo y filtros.
// Ejecutar con: npx tsx src/db/seed_extra.ts
// =============================================

import "dotenv/config";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host:     process.env.DB_HOST     ?? "localhost",
  port:     parseInt(process.env.DB_PORT ?? "3306"),
  user:     process.env.DB_USER     ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME     ?? "tele_import",
  dateStrings: true,
  charset: "utf8mb4",
  connectionLimit: 3,
});

interface ProductSeed {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  sku: string;
  price: number;
  compare_price: number | null;
  category_id: string;
  stock_quantity: number;
  is_featured: number;
  brand: string;
  model: string;
  images: { url: string; alt: string }[];
}

const extraProducts: ProductSeed[] = [
  // ===========================
  // GAMING (cat-gaming)
  // ===========================
  {
    id: "prod-gm-04", name: "Xbox Series S 512GB", slug: "xbox-series-s-512gb",
    short_description: "Consola Xbox Series S, 512GB SSD, 1440p gaming, 120fps.",
    description: "Xbox Series S con 512GB de NVMe SSD y resolución de hasta 1440p a 120fps. Potencia de próxima generación en el formato más compacto de Xbox. Compatible con miles de juegos de cuatro generaciones.",
    sku: "MSF-GM-XBOXSS-512", price: 580000, compare_price: 649000, category_id: "cat-gaming",
    stock_quantity: 8, is_featured: 1, brand: "Microsoft", model: "Xbox Series S",
    images: [
      { url: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600", alt: "Xbox Series S" },
    ],
  },
  {
    id: "prod-gm-05", name: "Auriculares Gamer HyperX Cloud II 7.1", slug: "hyperx-cloud-ii-71",
    short_description: "Auriculares gamer HyperX Cloud II con sonido surround 7.1 virtual y memoria espuma.",
    description: "HyperX Cloud II con sonido envolvente virtual 7.1, almohadillas de espuma viscoelástica, micrófono desmontable con cancelación de ruido. Compatible con PC, PS4, PS5, Xbox. Cable USB con control de audio.",
    sku: "HPX-GM-CLD2-71", price: 89000, compare_price: 109000, category_id: "cat-gaming",
    stock_quantity: 20, is_featured: 0, brand: "HyperX", model: "Cloud II",
    images: [
      { url: "https://images.unsplash.com/photo-1600086827875-a63b01f1335c?w=600", alt: "HyperX Cloud II" },
    ],
  },
  {
    id: "prod-gm-06", name: "Mouse Gamer Logitech G502 HERO", slug: "logitech-g502-hero",
    short_description: "Mouse gamer Logitech G502 HERO 25.600 DPI, 11 botones programables, pesos ajustables.",
    description: "Logitech G502 HERO con sensor HERO 25K de 25.600 DPI, 11 botones programables con memoria onboard, 5 pesos ajustables totalizando 18g, iluminación LIGHTSYNC RGB.",
    sku: "LOG-GM-G502H", price: 75000, compare_price: 92000, category_id: "cat-gaming",
    stock_quantity: 30, is_featured: 0, brand: "Logitech", model: "G502 HERO",
    images: [
      { url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600", alt: "Logitech G502 HERO" },
    ],
  },
  {
    id: "prod-gm-07", name: "Monitor Gamer AOC 27\" 165Hz IPS", slug: "aoc-27-165hz-ips",
    short_description: "Monitor gaming AOC 27\" IPS, 165Hz, 1ms MPRT, FreeSync Premium, Full HD.",
    description: "Monitor gamer AOC 27G2E con panel IPS Full HD de 27\", tasa de refresco de 165Hz, tiempo de respuesta de 1ms MPRT. AMD FreeSync Premium para gaming fluido sin tearing. Incluye HDMI x2, DisplayPort, USB x4.",
    sku: "AOC-GM-27G2E-165", price: 320000, compare_price: 380000, category_id: "cat-gaming",
    stock_quantity: 6, is_featured: 1, brand: "AOC", model: "27G2E",
    images: [
      { url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600", alt: "Monitor AOC 27 Gaming" },
    ],
  },
  {
    id: "prod-gm-08", name: "Gamepad Inalámbrico Xbox Controller", slug: "xbox-controller-wireless",
    short_description: "Control inalámbrico Xbox para PC y consola, Bluetooth, batería 40hs.",
    description: "Control inalámbrico Xbox con conectividad Bluetooth y USB-C. Textura en los gatillos y la empuñadura, botón Share, compatibilidad con Xbox Series X|S, Xbox One, PC Windows y Android vía Xbox App.",
    sku: "MSF-GM-XCTR-WL", price: 55000, compare_price: null, category_id: "cat-gaming",
    stock_quantity: 25, is_featured: 0, brand: "Microsoft", model: "Xbox Wireless Controller",
    images: [
      { url: "https://images.unsplash.com/photo-1585620385456-4759f9b5c7d9?w=600", alt: "Xbox Controller" },
    ],
  },

  // ===========================
  // ACCESORIOS (cat-accesorios)
  // ===========================
  {
    id: "prod-ac-05", name: "Hub USB-C 7 en 1 Anker", slug: "anker-hub-usb-c-7en1",
    short_description: "Hub USB-C Anker 7 en 1: HDMI 4K, 3x USB-A 3.0, SD, microSD, PD 100W.",
    description: "Hub USB-C Anker con 7 puertos: salida HDMI 4K@30Hz, 3 puertos USB-A 3.0 hasta 5Gbps, lector SD y microSD simultáneo, USB-C Power Delivery de 100W. Compatible con MacBook, iPad Pro, laptops Windows.",
    sku: "ANK-AC-HUB7C-PD", price: 42000, compare_price: 55000, category_id: "cat-accesorios",
    stock_quantity: 40, is_featured: 0, brand: "Anker", model: "A8346",
    images: [
      { url: "https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=600", alt: "Anker Hub USB-C 7 en 1" },
    ],
  },
  {
    id: "prod-ac-06", name: "Webcam Logitech C920 HD Pro", slug: "logitech-c920-hd-pro",
    short_description: "Webcam Logitech C920 Full HD 1080p, 30fps, micrófono estéreo integrado.",
    description: "Webcam Logitech C920 HD Pro con video Full HD 1080p a 30fps, lente de cristal Carl Zeiss con autofoco automático. Micrófonos estéreo integrados con reducción de ruido. Compatible con Zoom, Teams, Skype.",
    sku: "LOG-AC-C920-HD", price: 95000, compare_price: 115000, category_id: "cat-accesorios",
    stock_quantity: 18, is_featured: 1, brand: "Logitech", model: "C920",
    images: [
      { url: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600", alt: "Logitech C920" },
    ],
  },
  {
    id: "prod-ac-07", name: "SSD Externo Samsung T7 1TB", slug: "samsung-ssd-t7-1tb",
    short_description: "SSD portátil Samsung T7 1TB USB 3.2 Gen 2, velocidad 1050MB/s lectura.",
    description: "SSD portátil Samsung T7 de 1TB con USB 3.2 Gen 2 para velocidades de hasta 1050MB/s en lectura y 1000MB/s en escritura. Cuerpo metálico compacto (58g), compatible con PC, Mac, Android y consolas.",
    sku: "SAM-AC-SSD-T7-1TB", price: 165000, compare_price: 199000, category_id: "cat-accesorios",
    stock_quantity: 12, is_featured: 1, brand: "Samsung", model: "T7 MU-PC1T0T",
    images: [
      { url: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600", alt: "Samsung SSD T7 1TB" },
    ],
  },
  {
    id: "prod-ac-08", name: "Auriculares Bluetooth JBL Tune 770NC", slug: "jbl-tune-770nc",
    short_description: "Auriculares JBL Tune 770NC ANC, hasta 70hs de batería, plegable.",
    description: "JBL Tune 770NC con cancelación activa de ruido adaptativa, sonido JBL Pure Bass, hasta 70 horas de autonomía con ANC desactivado. Diseño plegable, carga USB-C. Compatible con multiconexión (2 dispositivos).",
    sku: "JBL-AC-T770NC", price: 78000, compare_price: 95000, category_id: "cat-accesorios",
    stock_quantity: 22, is_featured: 0, brand: "JBL", model: "Tune 770NC",
    images: [
      { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600", alt: "JBL Tune 770NC" },
    ],
  },
  {
    id: "prod-ac-09", name: "Mousepad Gamer XL RGB Redragon", slug: "redragon-mousepad-xl-rgb",
    short_description: "Mousepad gamer XL 900x400mm con iluminación RGB perimetral, base antideslizante.",
    description: "Mousepad Redragon SATURN P024 tamaño XL (900x400x4mm) con iluminación LED RGB en los bordes con 11 modos de color. Base de goma antideslizante, superficie de tela optimizada para gaming de alta precisión.",
    sku: "RED-AC-P024-XL", price: 22000, compare_price: 29000, category_id: "cat-accesorios",
    stock_quantity: 60, is_featured: 0, brand: "Redragon", model: "Saturn P024",
    images: [
      { url: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=600", alt: "Mousepad Gamer XL" },
    ],
  },

  // ===========================
  // SMARTPHONES (cat-smartphones)
  // ===========================
  {
    id: "prod-sp-04", name: "Samsung Galaxy S24 256GB", slug: "samsung-galaxy-s24-256gb",
    short_description: "Galaxy S24 con chip Exynos 2400, cámara 50MP, pantalla Dynamic AMOLED 2X.",
    description: "Samsung Galaxy S24 con procesador Exynos 2400, pantalla Dynamic AMOLED 2X de 6.2\" a 120Hz, cámara principal 50MP OIS, batería 4000mAh con carga rápida 25W. IP68, 7 años de actualizaciones OS.",
    sku: "SAM-SP-S24-256", price: 1450000, compare_price: 1599000, category_id: "cat-smartphones",
    stock_quantity: 8, is_featured: 1, brand: "Samsung", model: "Galaxy S24",
    images: [
      { url: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600", alt: "Samsung Galaxy S24" },
    ],
  },
  {
    id: "prod-sp-05", name: "Motorola Moto G84 256GB", slug: "motorola-moto-g84-256gb",
    short_description: "Moto G84 con pantalla pOLED 6.55\" 120Hz, Snapdragon 695, 50MP.",
    description: "Motorola Moto G84 con pantalla pOLED de 6.55\" a 120Hz, procesador Snapdragon 695, cámara de 50MP con OIS, batería de 5000mAh y carga rápida TurboPower 33W. 256GB de almacenamiento expandible.",
    sku: "MOT-SP-MG84-256", price: 420000, compare_price: null, category_id: "cat-smartphones",
    stock_quantity: 20, is_featured: 0, brand: "Motorola", model: "Moto G84",
    images: [
      { url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600", alt: "Motorola Moto G84" },
    ],
  },
  {
    id: "prod-sp-06", name: "Xiaomi Redmi Note 13 Pro 4G 256GB", slug: "xiaomi-redmi-note-13-pro",
    short_description: "Redmi Note 13 Pro con cámara 200MP, carga 67W, AMOLED 120Hz.",
    description: "Xiaomi Redmi Note 13 Pro 4G con cámara principal de 200MP y OIS, pantalla AMOLED de 6.67\" a 120Hz, batería de 5100mAh con carga rápida de 67W. Snapdragon 7s Gen 2, 256GB interno.",
    sku: "XIA-SP-RN13P-256", price: 570000, compare_price: 650000, category_id: "cat-smartphones",
    stock_quantity: 15, is_featured: 1, brand: "Xiaomi", model: "Redmi Note 13 Pro",
    images: [
      { url: "https://images.unsplash.com/photo-1595941069915-4ebc5197c14a?w=600", alt: "Xiaomi Redmi Note 13 Pro" },
    ],
  },

  // ===========================
  // AUDIO Y VIDEO (cat-audio)
  // ===========================
  {
    id: "prod-au-04", name: "Sony LinkBuds S True Wireless", slug: "sony-linkbuds-s",
    short_description: "Earbuds Sony LinkBuds S con ANC, sonido Hi-Res y hasta 20hs total.",
    description: "Sony LinkBuds S con cancelación activa de ruido y modo ambiente, sonido Hi-Res inalámbrico con LDAC, hasta 6hs de batería + 14hs extra del estuche. Resistencia al agua IPX4, peso ultra liviano de 4.8g.",
    sku: "SNY-AU-LNKBS", price: 145000, compare_price: 175000, category_id: "cat-audio",
    stock_quantity: 15, is_featured: 1, brand: "Sony", model: "LinkBuds S",
    images: [
      { url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600", alt: "Sony LinkBuds S" },
    ],
  },
  {
    id: "prod-au-05", name: "Bose SoundLink Flex Parlante Bluetooth", slug: "bose-soundlink-flex",
    short_description: "Parlante Bose SoundLink Flex IP67, diseño vertical, 12hs de batería.",
    description: "Bose SoundLink Flex con sonido Bose omnidireccional diseñado para posición vertical o acostado. Resistencia al agua IP67, flota en el agua. 12 horas de reproducción con batería recargable USB-C.",
    sku: "BSE-AU-SLFX", price: 220000, compare_price: 259000, category_id: "cat-audio",
    stock_quantity: 10, is_featured: 0, brand: "Bose", model: "SoundLink Flex",
    images: [
      { url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600", alt: "Bose SoundLink Flex" },
    ],
  },
  {
    id: "prod-au-06", name: "Proyector Epson Home Cinema 3LCD", slug: "epson-proyector-home-cinema",
    short_description: "Proyector Epson 3LCD Full HD 1080p, 3600 lúmenes, HDMI, Android TV integrado.",
    description: "Proyector Epson Home Cinema con tecnología 3LCD, resolución Full HD nativa 1080p, 3600 lúmenes de brillo. Android TV integrado con Google Assistant, HDMI x2, USB, corrección trapezoidal automática.",
    sku: "EPS-AU-PRJ3LCD", price: 680000, compare_price: 799000, category_id: "cat-audio",
    stock_quantity: 4, is_featured: 0, brand: "Epson", model: "EF-21",
    images: [
      { url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600", alt: "Proyector Epson" },
    ],
  },

  // ===========================
  // LAPTOPS Y PCs (cat-laptops)
  // ===========================
  {
    id: "prod-lt-04", name: "MacBook Air M2 256GB", slug: "macbook-air-m2-256gb",
    short_description: "MacBook Air con chip M2, pantalla Liquid Retina 13.6\", autonomía 18hs.",
    description: "MacBook Air con chip Apple M2, pantalla Liquid Retina de 13.6\" con 500 nits de brillo. CPU de 8 núcleos, GPU de 8 núcleos, 8GB de memoria unificada, SSD de 256GB. Carga MagSafe, cámara 1080p, autonomía de hasta 18 horas.",
    sku: "APL-LT-MBA-M2-256", price: 2100000, compare_price: 2390000, category_id: "cat-laptops",
    stock_quantity: 4, is_featured: 1, brand: "Apple", model: "MacBook Air M2 MLXW3LL",
    images: [
      { url: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600", alt: "MacBook Air M2" },
    ],
  },
  {
    id: "prod-lt-05", name: "MSI Laptop Thin GF63 Intel i5 RTX4050", slug: "msi-thin-gf63-rtx4050",
    short_description: "Laptop gaming MSI 15.6\" FHD 144Hz, Intel i5-12450H, RTX 4050 6GB, 16GB RAM.",
    description: "MSI Thin GF63 con pantalla IPS Full HD de 15.6\" a 144Hz, procesador Intel Core i5-12450H, GPU RTX 4050 de 6GB GDDR6, 16GB RAM DDR4, SSD NVMe 512GB. Teclado retroiluminado rojo, HDMI, USB-C.",
    sku: "MSI-LT-GF63-R4050", price: 1350000, compare_price: null, category_id: "cat-laptops",
    stock_quantity: 3, is_featured: 1, brand: "MSI", model: "Thin GF63 12UC",
    images: [
      { url: "https://images.unsplash.com/photo-1593642634443-44adaa06623a?w=600", alt: "MSI Gaming Laptop" },
    ],
  },

  // ===========================
  // TELEVISORES (cat-tv)
  // ===========================
  {
    id: "prod-tv-04", name: "Samsung 65\" Neo QLED 8K Smart TV", slug: "samsung-65-neo-qled-8k",
    short_description: "Samsung 65\" Neo QLED 8K con Procesador Neural Quantum 8K y Pantalla sin bordes.",
    description: "Samsung QN700C Neo QLED 8K de 65 pulgadas con procesador Neural Quantum 8K que potencia la IA para upscaling de contenido. Pantalla Infinity Screen sin bordes, Dolby Atmos, Tizen OS con Gaming Hub.",
    sku: "SAM-TV-QN65Q700C", price: 2500000, compare_price: 2890000, category_id: "cat-tv",
    stock_quantity: 2, is_featured: 1, brand: "Samsung", model: "QN65QN700CGXZB",
    images: [
      { url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600", alt: "Samsung Neo QLED 8K" },
    ],
  },
  {
    id: "prod-tv-05", name: "TCL 32\" HD Smart TV con Roku", slug: "tcl-32-hd-roku",
    short_description: "Smart TV TCL 32\" HD con Roku TV integrado, acceso a 500+ canales.",
    description: "Smart TV TCL 32S331 con pantalla HD de 32 pulgadas y sistema Roku TV integrado para acceso a más de 500 canales gratuitos y plataformas como Netflix, Disney+, Prime Video. Incluye control remoto con accesos directos.",
    sku: "TCL-TV-32S331", price: 230000, compare_price: 269000, category_id: "cat-tv",
    stock_quantity: 25, is_featured: 0, brand: "TCL", model: "32S331",
    images: [
      { url: "https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=600", alt: "TCL 32 HD Roku" },
    ],
  },

  // ===========================
  // LÍNEA BLANCA (cat-linea-blanca)
  // ===========================
  {
    id: "prod-lb-04", name: "LG Aire Acondicionado Split 3000 Frigorías Inverter", slug: "lg-aire-split-3000f",
    short_description: "Aire acondicionado LG split frío/calor 3000 frigorías, Inverter, Wi-Fi.",
    description: "Aire acondicionado LG split 12000 BTU Inverter con tecnología Dual Cool para mayor eficiencia energética y temperatura precisa. Control Wi-Fi desde ThinQ app, filtro antibacteriano, clase A++.",
    sku: "LG-LB-AC3000F-INV", price: 890000, compare_price: 1050000, category_id: "cat-linea-blanca",
    stock_quantity: 5, is_featured: 1, brand: "LG", model: "S12ET.UWGLE",
    images: [
      { url: "https://images.unsplash.com/photo-1633939682-ba2f66e3e5b2?w=600", alt: "LG Aire Split Inverter" },
    ],
  },
  {
    id: "prod-lb-05", name: "Whirlpool Lavavajillas 12 Cubiertos", slug: "whirlpool-lavavajillas-12c",
    short_description: "Lavavajillas Whirlpool 12 cubiertos, 6 programas, clase A++.",
    description: "Lavavajillas Whirlpool WFC3C26PF de 12 cubiertos con 6 programas de lavado incluyendo ECO y vapor a 70°C. Nivel de ruido de 44dB, paneles adaptables a tu cocina. Display digital, clase energética A++.",
    sku: "WHP-LB-LVJ12C", price: 650000, compare_price: null, category_id: "cat-linea-blanca",
    stock_quantity: 4, is_featured: 0, brand: "Whirlpool", model: "WFC3C26PF",
    images: [
      { url: "https://images.unsplash.com/photo-1558618047-f4e80e24c4c2?w=600", alt: "Whirlpool Lavavajillas" },
    ],
  },

  // ===========================
  // PEQUEÑOS ELECTRODOMÉSTICOS (cat-pequenos)
  // ===========================
  {
    id: "prod-pe-04", name: "Oster Airfryer Digital 5.7L", slug: "oster-airfryer-57l",
    short_description: "Freidora de aire Oster 5.7L, 1700W, 8 menús preestablecidos, pantalla táctil.",
    description: "Freidora sin aceite Oster Digital Air Fryer de 5.7 litros con tecnología Rapid Crisp 360°. 1700W, 8 programas preestablecidos, control táctil con pantalla LED, rango de temperatura 80-200°C.",
    sku: "OST-PE-AF57-DIG", price: 115000, compare_price: 139000, category_id: "cat-pequenos",
    stock_quantity: 30, is_featured: 1, brand: "Oster", model: "CKSTAF5711-053",
    images: [
      { url: "https://images.unsplash.com/photo-1648146290848-0c7e2cf5c4fd?w=600", alt: "Oster Airfryer" },
    ],
  },
  {
    id: "prod-pe-05", name: "Philips Licuadora de Alta Velocidad 1200W", slug: "philips-licuadora-1200w",
    short_description: "Licuadora Philips 1200W jarra de 2L con tecnología ProBlend 6 3D.",
    description: "Licuadora Philips HR2194 con motor de 1200W y tecnología ProBlend 6 3D para triturar hielo y frutas congeladas. Jarra de 2L de Tritan irrompible, cuchillas en 3 niveles, función turbo, 3 velocidades.",
    sku: "PHI-PE-LIC1200W", price: 128000, compare_price: 149000, category_id: "cat-pequenos",
    stock_quantity: 18, is_featured: 0, brand: "Philips", model: "HR2194",
    images: [
      { url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600", alt: "Philips Licuadora 1200W" },
    ],
  },
];

async function runExtraSeed() {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    let inserted = 0;
    let skipped = 0;

    for (const product of extraProducts) {
      // Verificar si el producto ya existe
      const [existing] = await conn.query<mysql.RowDataPacket[]>(
        "SELECT id FROM products WHERE id = ? OR slug = ? OR sku = ?",
        [product.id, product.slug, product.sku]
      );

      if ((existing as mysql.RowDataPacket[]).length > 0) {
        console.log(`[Seed Extra] Producto "${product.name}" ya existe, omitiendo.`);
        skipped++;
        continue;
      }

      const { images, ...pd } = product;

      await conn.query(
        `INSERT INTO products
           (id, name, slug, short_description, description, sku, price, compare_price,
            category_id, stock_quantity, is_active, is_featured, brand, model)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          pd.id, pd.name, pd.slug, pd.short_description, pd.description,
          pd.sku, pd.price, pd.compare_price ?? null,
          pd.category_id, pd.stock_quantity, pd.is_featured, pd.brand, pd.model,
        ]
      );

      for (let idx = 0; idx < images.length; idx++) {
        const imgId = `img-${pd.id}-${idx}`;
        // Verificar si la imagen ya existe
        const [existingImg] = await conn.query<mysql.RowDataPacket[]>(
          "SELECT id FROM product_images WHERE id = ?", [imgId]
        );
        if ((existingImg as mysql.RowDataPacket[]).length === 0) {
          await conn.query(
            `INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [imgId, pd.id, images[idx].url, images[idx].alt, idx]
          );
        }
      }

      console.log(`[Seed Extra] ✓ Insertado: ${product.name}`);
      inserted++;
    }

    await conn.commit();
    console.log(`\n[Seed Extra] Completado: ${inserted} productos insertados, ${skipped} omitidos.`);
  } catch (err) {
    await conn.rollback();
    console.error("[Seed Extra] Error, se revirtieron los cambios:", err);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

runExtraSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
