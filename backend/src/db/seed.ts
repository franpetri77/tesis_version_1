// =============================================
// DATOS INICIALES DE LA BASE DE DATOS
// Carga categorías, productos y usuario admin si la DB está vacía.
// Ejecutar con: npx tsx src/db/seed.ts
// =============================================

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { initSchema } from "./schema";

const DB_PATH = path.resolve(process.cwd(), "tele_import.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
initSchema(db);

// -----------------------------------------------
// Helper para verificar si ya hay datos
// -----------------------------------------------
const existingCategories = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
if (existingCategories.count > 0) {
  console.log("[Seed] La base de datos ya tiene datos. Omitiendo seed.");
  process.exit(0);
}

// -----------------------------------------------
// CATEGORÍAS
// -----------------------------------------------
const categories = [
  { id: "cat-tv",          name: "Televisores",              slug: "televisores",        description: "Smart TV, 4K, OLED y QLED",                    sort_order: 1 },
  { id: "cat-smartphones", name: "Smartphones",              slug: "smartphones",        description: "Celulares de todas las marcas",                 sort_order: 2 },
  { id: "cat-laptops",     name: "Laptops y PCs",            slug: "laptops-pcs",        description: "Computadoras portátiles y de escritorio",       sort_order: 3 },
  { id: "cat-audio",       name: "Audio y Video",            slug: "audio-video",        description: "Auriculares, parlantes y soundbars",            sort_order: 4 },
  { id: "cat-linea-blanca",name: "Línea Blanca",             slug: "linea-blanca",       description: "Heladeras, lavarropas y cocinas",               sort_order: 5 },
  { id: "cat-pequenos",    name: "Pequeños Electrodomésticos", slug: "pequenos-electro", description: "Licuadoras, cafeteras y planchas",              sort_order: 6 },
  { id: "cat-gaming",      name: "Gaming",                   slug: "gaming",             description: "Consolas, videojuegos y accesorios gamer",      sort_order: 7 },
  { id: "cat-accesorios",  name: "Accesorios y Periféricos", slug: "accesorios",         description: "Mouse, teclados, monitores y más",              sort_order: 8 },
];

const insertCategory = db.prepare(`
  INSERT INTO categories (id, name, slug, description, sort_order, is_active)
  VALUES (@id, @name, @slug, @description, @sort_order, 1)
`);

for (const cat of categories) {
  insertCategory.run(cat);
}
console.log(`[Seed] ${categories.length} categorías insertadas.`);

// -----------------------------------------------
// PRODUCTOS
// Imágenes usando servicios públicos de placeholder realistas
// -----------------------------------------------
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

const products: ProductSeed[] = [
  // ===========================
  // TELEVISORES
  // ===========================
  {
    id: "prod-tv-01",
    name: "Samsung 55\" QLED 4K Smart TV",
    slug: "samsung-55-qled-4k",
    short_description: "QLED 4K con procesador Neo Quantum, HDR10+ y Tizen OS.",
    description: "Televisor Samsung 55 pulgadas con tecnología Quantum Dot que ofrece colores vibrantes y contraste excepcional. Procesador Neural Quantum 4K, sistema operativo Tizen con acceso a todas las plataformas de streaming. Incluye control remoto solar y soporte para Alexa y Google Assistant.",
    sku: "SAM-TV-QN55Q70",
    price: 850000,
    compare_price: 999000,
    category_id: "cat-tv",
    stock_quantity: 15,
    is_featured: 1,
    brand: "Samsung",
    model: "QN55Q70DAGXZB",
    images: [
      { url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600", alt: "Samsung QLED 55 frente" },
      { url: "https://images.unsplash.com/photo-1571415060716-baff5ea3b5c3?w=600", alt: "Samsung QLED 55 lateral" },
    ],
  },
  {
    id: "prod-tv-02",
    name: "LG 43\" Full HD Smart TV",
    slug: "lg-43-full-hd",
    short_description: "Smart TV LG 43\" con webOS, HDR y sonido Virtual Surround.",
    description: "Televisor LG 43 pulgadas Full HD con sistema operativo webOS para acceso rápido a Netflix, YouTube, Prime Video y más. Tecnología HDR que mejora el contraste y la luminosidad. Sonido Virtual Surround Plus 2.0.",
    sku: "LG-TV-43LM6300",
    price: 420000,
    compare_price: 489000,
    category_id: "cat-tv",
    stock_quantity: 22,
    is_featured: 0,
    brand: "LG",
    model: "43LM6300PSA",
    images: [
      { url: "https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=600", alt: "LG 43 Full HD" },
    ],
  },
  {
    id: "prod-tv-03",
    name: "TCL 50\" 4K UHD Android TV",
    slug: "tcl-50-4k-android",
    short_description: "Smart TV TCL 50\" 4K con Android TV 11 y Google Chromecast integrado.",
    description: "Televisor TCL 50 pulgadas con resolución 4K Ultra HD y Android TV 11. Acceso a Google Play Store, Chromecast integrado, compatible con Google Assistant. Tecnología Dolby Vision y Dolby Atmos para imagen y sonido cinematográfico.",
    sku: "TCL-TV-50P635",
    price: 520000,
    compare_price: null,
    category_id: "cat-tv",
    stock_quantity: 18,
    is_featured: 1,
    brand: "TCL",
    model: "50P635",
    images: [
      { url: "https://images.unsplash.com/photo-1601944179066-29786cb9d32a?w=600", alt: "TCL 50 4K Android TV" },
    ],
  },

  // ===========================
  // SMARTPHONES
  // ===========================
  {
    id: "prod-sp-01",
    name: "Samsung Galaxy A55 5G 256GB",
    slug: "samsung-galaxy-a55-5g",
    short_description: "Galaxy A55 con cámara de 50MP, pantalla AMOLED 120Hz y 5G.",
    description: "Samsung Galaxy A55 5G con pantalla Super AMOLED de 6.6\" a 120Hz, procesador Exynos 1480, cámara principal de 50MP con OIS, batería de 5000mAh con carga rápida de 25W. Memoria interna de 256GB con 8GB de RAM. Resistencia al agua IP67.",
    sku: "SAM-SP-A556B-256",
    price: 680000,
    compare_price: 749000,
    category_id: "cat-smartphones",
    stock_quantity: 30,
    is_featured: 1,
    brand: "Samsung",
    model: "Galaxy A55 5G",
    images: [
      { url: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600", alt: "Samsung Galaxy A55" },
      { url: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600", alt: "Samsung Galaxy A55 cámara" },
    ],
  },
  {
    id: "prod-sp-02",
    name: "Motorola Edge 50 Neo 256GB",
    slug: "motorola-edge-50-neo",
    short_description: "Motorola Edge 50 Neo con pantalla pOLED 120Hz y cámara de 50MP.",
    description: "Motorola Edge 50 Neo con pantalla pOLED de 6.36\" curva a 120Hz, procesador MediaTek Dimensity 7300, sistema de cámara con sensor principal de 50MP y OIS. Batería de 4310mAh con carga rápida de 68W y carga inalámbrica de 15W. Disponible en varios colores.",
    sku: "MOT-SP-EDGE50N-256",
    price: 590000,
    compare_price: null,
    category_id: "cat-smartphones",
    stock_quantity: 25,
    is_featured: 0,
    brand: "Motorola",
    model: "Edge 50 Neo",
    images: [
      { url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600", alt: "Motorola Edge 50 Neo" },
    ],
  },
  {
    id: "prod-sp-03",
    name: "iPhone 15 128GB",
    slug: "iphone-15-128gb",
    short_description: "iPhone 15 con chip A16 Bionic, cámara principal 48MP y Dynamic Island.",
    description: "Apple iPhone 15 con chip A16 Bionic, pantalla Super Retina XDR de 6.1\" con Dynamic Island. Cámara principal de 48MP con modo Retrato mejorado y Smart HDR 5. Puerto USB-C, resistencia al agua IP68. iOS 17 con actualizaciones garantizadas.",
    sku: "APL-SP-IP15-128",
    price: 1250000,
    compare_price: 1390000,
    category_id: "cat-smartphones",
    stock_quantity: 12,
    is_featured: 1,
    brand: "Apple",
    model: "iPhone 15",
    images: [
      { url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600", alt: "iPhone 15" },
    ],
  },

  // ===========================
  // LAPTOPS Y PCs
  // ===========================
  {
    id: "prod-lt-01",
    name: "Lenovo IdeaPad 3 15\" Intel i5",
    slug: "lenovo-ideapad-3-i5",
    short_description: "Laptop Lenovo 15.6\" FHD, Intel Core i5-1235U, 8GB RAM, SSD 512GB.",
    description: "Laptop Lenovo IdeaPad 3 con pantalla Full HD de 15.6\", procesador Intel Core i5-1235U de 12a generación, 8GB de memoria RAM DDR4 y SSD de 512GB. Teclado numérico, batería de hasta 7 horas, Windows 11 Home. Ideal para estudio y trabajo cotidiano.",
    sku: "LEN-LT-IP3-I5-512",
    price: 720000,
    compare_price: 850000,
    category_id: "cat-laptops",
    stock_quantity: 8,
    is_featured: 1,
    brand: "Lenovo",
    model: "IdeaPad 3 15IAU7",
    images: [
      { url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600", alt: "Lenovo IdeaPad 3" },
    ],
  },
  {
    id: "prod-lt-02",
    name: "HP Pavilion 15 AMD Ryzen 5",
    slug: "hp-pavilion-15-ryzen5",
    short_description: "HP Pavilion 15.6\" FHD, AMD Ryzen 5 7530U, 16GB RAM, SSD 512GB.",
    description: "Laptop HP Pavilion con pantalla Full HD IPS anti-reflejo de 15.6\", procesador AMD Ryzen 5 7530U, 16GB de RAM y SSD NVMe de 512GB. Gráficos Radeon, Wi-Fi 6, Bluetooth 5.3. Windows 11 Home. Diseño delgado y portátil con acabado natural silver.",
    sku: "HP-LT-PAV15-R5",
    price: 780000,
    compare_price: null,
    category_id: "cat-laptops",
    stock_quantity: 10,
    is_featured: 0,
    brand: "HP",
    model: "Pavilion 15-eh3000la",
    images: [
      { url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600", alt: "HP Pavilion 15" },
    ],
  },
  {
    id: "prod-lt-03",
    name: "ASUS VivoBook 14 Intel i3",
    slug: "asus-vivobook-14-i3",
    short_description: "Laptop ultradelgada ASUS 14\" FHD, Intel Core i3, 8GB RAM, SSD 256GB.",
    description: "ASUS VivoBook 14 con diseño compacto y liviano (1.4kg), pantalla Full HD de 14\", procesador Intel Core i3 de 12a generación, 8GB RAM y SSD de 256GB. Lector de huellas digitales, teclado retroiluminado, USB-C, HDMI. Windows 11 Home S.",
    sku: "ASUS-LT-VB14-I3",
    price: 560000,
    compare_price: 640000,
    category_id: "cat-laptops",
    stock_quantity: 14,
    is_featured: 0,
    brand: "ASUS",
    model: "VivoBook 14 X1404ZA",
    images: [
      { url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600", alt: "ASUS VivoBook 14" },
    ],
  },

  // ===========================
  // AUDIO Y VIDEO
  // ===========================
  {
    id: "prod-au-01",
    name: "Sony WH-1000XM5 Auriculares Bluetooth",
    slug: "sony-wh1000xm5",
    short_description: "Auriculares Sony con cancelación de ruido líder del sector y 30hs de batería.",
    description: "Sony WH-1000XM5, los auriculares inalámbricos con la mejor cancelación de ruido del mercado. Hasta 30 horas de autonomía, 8 micrófonos para llamadas nítidas, audio de alta resolución con LDAC. Carga rápida: 3 minutos = 3 horas de reproducción. Diseño ultraligero de 250g.",
    sku: "SNY-AU-WH1000XM5",
    price: 420000,
    compare_price: 499000,
    category_id: "cat-audio",
    stock_quantity: 20,
    is_featured: 1,
    brand: "Sony",
    model: "WH-1000XM5",
    images: [
      { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600", alt: "Sony WH-1000XM5" },
    ],
  },
  {
    id: "prod-au-02",
    name: "JBL Charge 5 Parlante Bluetooth",
    slug: "jbl-charge-5",
    short_description: "Parlante portátil JBL con sonido potente, resistencia IP67 y 20hs de batería.",
    description: "JBL Charge 5 con sonido de alta calidad, graves profundos gracias al woofer de largo recorrido y tweeter separado. Batería de 7500mAh que además carga tus dispositivos. Resistente al polvo y al agua IP67. Modo fiesta para conectar hasta 100 dispositivos JBL.",
    sku: "JBL-AU-CHG5",
    price: 180000,
    compare_price: 219000,
    category_id: "cat-audio",
    stock_quantity: 35,
    is_featured: 1,
    brand: "JBL",
    model: "Charge 5",
    images: [
      { url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600", alt: "JBL Charge 5" },
    ],
  },
  {
    id: "prod-au-03",
    name: "Samsung Soundbar HW-B450 2.1",
    slug: "samsung-soundbar-hwb450",
    short_description: "Soundbar Samsung 2.1 canales, 300W, subwoofer inalámbrico y Bluetooth.",
    description: "Samsung Soundbar HW-B450 con 2.1 canales y 300W de potencia total. Subwoofer inalámbrico incluido para graves profundos. Conectividad Bluetooth, HDMI ARC y óptico. Modos de sonido: Standard, Surround Sound Expansion. Compatible con Dolby Digital.",
    sku: "SAM-AU-HWB450",
    price: 290000,
    compare_price: null,
    category_id: "cat-audio",
    stock_quantity: 12,
    is_featured: 0,
    brand: "Samsung",
    model: "HW-B450",
    images: [
      { url: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600", alt: "Samsung Soundbar HW-B450" },
    ],
  },

  // ===========================
  // LÍNEA BLANCA
  // ===========================
  {
    id: "prod-lb-01",
    name: "Samsung Heladera No Frost 400L",
    slug: "samsung-heladera-no-frost-400l",
    short_description: "Heladera Samsung No Frost 400L, dispensador de agua, inverter.",
    description: "Heladera Samsung Bottom Freezer de 400 litros con tecnología No Frost para olvidarte del hielo. Compresor Digital Inverter con 10 años de garantía y 30% más eficiencia energética. Compartimiento All Around Cooling para temperatura uniforme. Cajón Optimal Fresh. Clase A+.",
    sku: "SAM-LB-HNF400",
    price: 980000,
    compare_price: 1150000,
    category_id: "cat-linea-blanca",
    stock_quantity: 6,
    is_featured: 1,
    brand: "Samsung",
    model: "RT40K5522S8",
    images: [
      { url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600", alt: "Samsung Heladera No Frost" },
    ],
  },
  {
    id: "prod-lb-02",
    name: "LG Lavarropas Inverter 9Kg",
    slug: "lg-lavarropas-inverter-9kg",
    short_description: "Lavarropas LG carga frontal 9kg, motor Inverter Direct Drive, 1200rpm.",
    description: "Lavarropas LG carga frontal de 9Kg con motor Inverter Direct Drive con 10 años de garantía. Tecnología AI DD que reconoce el tipo de ropa y selecciona el movimiento óptimo. Función Vapor que elimina bacterias y alergenos. Clase de eficiencia energética A. 1200 RPM de centrifugado.",
    sku: "LG-LB-LW9KG-INV",
    price: 720000,
    compare_price: 850000,
    category_id: "cat-linea-blanca",
    stock_quantity: 8,
    is_featured: 0,
    brand: "LG",
    model: "F4WV309S6E",
    images: [
      { url: "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?w=600", alt: "LG Lavarropas Inverter" },
    ],
  },
  {
    id: "prod-lb-03",
    name: "Whirlpool Microondas 25L Digital",
    slug: "whirlpool-microondas-25l",
    short_description: "Microondas Whirlpool 25L con grill, 10 niveles de potencia y display LED.",
    description: "Microondas Whirlpool WM25GDX de 25 litros con función grill integrado para dorar y gratinar. 10 niveles de potencia, temporizador digital, función descongelado automático por peso. Plato giratorio de 27cm, apertura con manija. Panel de control LED intuitivo.",
    sku: "WHP-LB-MWO25L",
    price: 175000,
    compare_price: 199000,
    category_id: "cat-linea-blanca",
    stock_quantity: 20,
    is_featured: 0,
    brand: "Whirlpool",
    model: "WM25GDX",
    images: [
      { url: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600", alt: "Whirlpool Microondas 25L" },
    ],
  },

  // ===========================
  // PEQUEÑOS ELECTRODOMÉSTICOS
  // ===========================
  {
    id: "prod-pe-01",
    name: "Philips Licuadora 700W Jarra Vidrio",
    slug: "philips-licuadora-700w",
    short_description: "Licuadora Philips 700W con jarra de vidrio 2L, 5 velocidades y función pulse.",
    description: "Licuadora Philips con motor de 700W y jarra de vidrio de 2 litros resistente al calor. Sistema ProBlend para una mezcla uniforme, 5 velocidades más función pulse y turbo. Cuchillas de acero inoxidable removibles para fácil limpieza. Apta para lavavajillas.",
    sku: "PHI-PE-LIC700W",
    price: 89000,
    compare_price: 109000,
    category_id: "cat-pequenos",
    stock_quantity: 40,
    is_featured: 0,
    brand: "Philips",
    model: "HR2116/00",
    images: [
      { url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600", alt: "Philips Licuadora" },
    ],
  },
  {
    id: "prod-pe-02",
    name: "Oster Cafetera Express 19 Bar",
    slug: "oster-cafetera-express-19bar",
    short_description: "Cafetera Oster espresso y cappuccino, 19 bares, vaporizador de leche, 1.2L.",
    description: "Cafetera Oster Prima Latte III con sistema de 19 bares de presión para extraer espresso de barismo. Vaporizador giroscópico para preparar cappuccinos y lattes cremosos. Depósito extraíble de 1.2L, bandeja calienta tazas, porta filtro para cápsulas y café molido.",
    sku: "OST-PE-CAF19B",
    price: 145000,
    compare_price: 169000,
    category_id: "cat-pequenos",
    stock_quantity: 25,
    is_featured: 1,
    brand: "Oster",
    model: "BVSTEM6603SS",
    images: [
      { url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600", alt: "Oster Cafetera Express" },
    ],
  },
  {
    id: "prod-pe-03",
    name: "Rowenta Plancha Vapor 2400W",
    slug: "rowenta-plancha-vapor-2400w",
    short_description: "Plancha Rowenta 2400W con suela Microsteam 400, golpe de vapor 180g/min.",
    description: "Plancha Rowenta DW5197 con suela de acero inoxidable Microsteam 400 con 400 orificios para una distribución perfecta del vapor. Potencia de 2400W, golpe de vapor de 180g/min, depósito de 330ml. Función auto-clean y anti-goteo. Temperatura óptima para cualquier tejido.",
    sku: "ROW-PE-PLN2400",
    price: 98000,
    compare_price: null,
    category_id: "cat-pequenos",
    stock_quantity: 18,
    is_featured: 0,
    brand: "Rowenta",
    model: "DW5197",
    images: [
      { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600", alt: "Rowenta Plancha Vapor" },
    ],
  },

  // ===========================
  // GAMING
  // ===========================
  {
    id: "prod-gm-01",
    name: "Sony PlayStation 5 Slim Digital",
    slug: "playstation-5-slim-digital",
    short_description: "PS5 Slim edición Digital, 1TB SSD, resolución 4K y 120fps.",
    description: "PlayStation 5 Slim edición Digital sin lector de discos. SSD ultrarrápido de 1TB, resolución hasta 8K, velocidades de fotograma de hasta 120fps. Compatible con PS4. DualSense inalámbrico incluido con retroalimentación háptica y gatillos adaptivos. Tamaño reducido 30% respecto al original.",
    sku: "SNY-GM-PS5SLIM-DIG",
    price: 950000,
    compare_price: 1090000,
    category_id: "cat-gaming",
    stock_quantity: 5,
    is_featured: 1,
    brand: "Sony",
    model: "CFI-2000",
    images: [
      { url: "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=600", alt: "PlayStation 5 Slim" },
    ],
  },
  {
    id: "prod-gm-02",
    name: "Nintendo Switch OLED 64GB",
    slug: "nintendo-switch-oled",
    short_description: "Nintendo Switch OLED con pantalla de 7\", 64GB y base con puerto LAN.",
    description: "Nintendo Switch OLED con vibrante pantalla OLED de 7 pulgadas, 64GB de almacenamiento interno expandible, Joy-Con mejorados con botón Home retroiluminado. Base actualizada con puerto LAN. Hasta 9 horas de batería en modo portátil. Compatible con todos los juegos de Nintendo Switch.",
    sku: "NIN-GM-SW-OLED",
    price: 620000,
    compare_price: 699000,
    category_id: "cat-gaming",
    stock_quantity: 10,
    is_featured: 1,
    brand: "Nintendo",
    model: "HEG-001",
    images: [
      { url: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600", alt: "Nintendo Switch OLED" },
    ],
  },
  {
    id: "prod-gm-03",
    name: "Silla Gamer DXRacer Formula OH/FH08",
    slug: "silla-gamer-dxracer-fh08",
    short_description: "Silla gamer DXRacer con soporte lumbar, reposabrazos 3D y reclinación 135°.",
    description: "Silla gaming DXRacer Formula Series con espuma de alta densidad, reposabrazos ajustables en 3D, soporte lumbar y cervical extraíbles. Respaldo reclinable de 90° a 135°, altura regulable. Ruedas de PU silenciosas para todo tipo de suelo. Peso máximo soportado: 90kg.",
    sku: "DXR-GM-FH08-BK",
    price: 380000,
    compare_price: 439000,
    category_id: "cat-gaming",
    stock_quantity: 7,
    is_featured: 0,
    brand: "DXRacer",
    model: "OH/FH08/N",
    images: [
      { url: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=600", alt: "Silla Gamer DXRacer" },
    ],
  },

  // ===========================
  // ACCESORIOS Y PERIFÉRICOS
  // ===========================
  {
    id: "prod-ac-01",
    name: "Monitor LG 24\" Full HD IPS",
    slug: "monitor-lg-24-fhd",
    short_description: "Monitor LG 24\" IPS, 75Hz, 1ms, FreeSync, HDMI y DisplayPort.",
    description: "Monitor LG 24MK430H-B de 24 pulgadas IPS Full HD (1920x1080) con tecnología AMD FreeSync para gaming fluido. Tasa de refresco de 75Hz, tiempo de respuesta de 1ms. Ajuste de inclinación, VESA 100x100. Conectividad HDMI y D-Sub. Flicker Safe y Reader Mode para protección visual.",
    sku: "LG-AC-MON24FHD",
    price: 230000,
    compare_price: 275000,
    category_id: "cat-accesorios",
    stock_quantity: 15,
    is_featured: 0,
    brand: "LG",
    model: "24MK430H-B",
    images: [
      { url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600", alt: "Monitor LG 24 FHD" },
    ],
  },
  {
    id: "prod-ac-02",
    name: "Logitech MX Master 3S Mouse Inalámbrico",
    slug: "logitech-mx-master-3s",
    short_description: "Mouse inalámbrico Logitech MX Master 3S con scroll MagSpeed y 8000 DPI.",
    description: "Logitech MX Master 3S con desplazamiento electromagnético MagSpeed ultrarrápido, sensor óptico de 8000 DPI con seguimiento en cualquier superficie. Conectividad Bluetooth o receptor USB Unifying. Botones laterales programables, carga USB-C, batería de 70 días.",
    sku: "LOG-AC-MXMAS3S",
    price: 120000,
    compare_price: null,
    category_id: "cat-accesorios",
    stock_quantity: 28,
    is_featured: 1,
    brand: "Logitech",
    model: "MX Master 3S",
    images: [
      { url: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600", alt: "Logitech MX Master 3S" },
    ],
  },
  {
    id: "prod-ac-03",
    name: "Redragon K552 Teclado Mecánico RGB",
    slug: "redragon-k552-rgb",
    short_description: "Teclado mecánico Redragon TKL 87 teclas, switches Blue, retroiluminación RGB.",
    description: "Teclado mecánico Redragon K552 Kumara formato TKL (sin numpad) con switches Red Dragon Blue táctiles y clicky. Retroiluminación RGB con 9 modos de iluminación. Cuerpo de metal, cable trenzado USB. 87 teclas con anti-ghosting completo. Keycaps de doble inyección.",
    sku: "RED-AC-K552-RGB",
    price: 68000,
    compare_price: 85000,
    category_id: "cat-accesorios",
    stock_quantity: 50,
    is_featured: 0,
    brand: "Redragon",
    model: "K552",
    images: [
      { url: "https://images.unsplash.com/photo-1561112078-7d24e04c3407?w=600", alt: "Redragon K552 Teclado" },
    ],
  },
  {
    id: "prod-ac-04",
    name: "Kingston Pendrive USB 3.2 64GB",
    slug: "kingston-pendrive-64gb",
    short_description: "Pendrive Kingston DataTraveler Exodia 64GB USB 3.2 Gen 1 hasta 400MB/s.",
    description: "Pendrive Kingston DataTraveler Exodia 64GB con conector USB 3.2 Gen 1. Velocidad de lectura de hasta 400MB/s y escritura de hasta 60MB/s. Tapa separada del cuerpo con argolla para llavero. Compatible con USB 2.0. Garantía de por vida.",
    sku: "KIN-AC-DT64GB",
    price: 15000,
    compare_price: 19000,
    category_id: "cat-accesorios",
    stock_quantity: 100,
    is_featured: 0,
    brand: "Kingston",
    model: "DTX/64GB",
    images: [
      { url: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600", alt: "Kingston Pendrive 64GB" },
    ],
  },
];

// -----------------------------------------------
// Insertar productos e imágenes en transacción
// -----------------------------------------------
const insertProduct = db.prepare(`
  INSERT INTO products (id, name, slug, short_description, description, sku, price, compare_price,
    category_id, stock_quantity, is_active, is_featured, brand, model)
  VALUES (@id, @name, @slug, @short_description, @description, @sku, @price, @compare_price,
    @category_id, @stock_quantity, 1, @is_featured, @brand, @model)
`);

const insertImage = db.prepare(`
  INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
  VALUES (@product_id, @image_url, @alt_text, @sort_order)
`);

const seedTransaction = db.transaction(() => {
  for (const product of products) {
    const { images, ...productData } = product;
    insertProduct.run(productData);

    images.forEach((img, idx) => {
      insertImage.run({
        product_id: product.id,
        image_url: img.url,
        alt_text: img.alt,
        sort_order: idx,
      });
    });
  }
});

seedTransaction();
console.log(`[Seed] ${products.length} productos insertados con sus imágenes.`);

// -----------------------------------------------
// USUARIO ADMINISTRADOR
// -----------------------------------------------
const adminPassword = bcrypt.hashSync("admin123", 10);
db.prepare(`
  INSERT INTO users (id, email, password, first_name, last_name, role)
  VALUES ('usr-admin-01', 'admin@teleimport.com', ?, 'Admin', 'Tele Import', 'admin')
`).run(adminPassword);
console.log("[Seed] Usuario admin creado: admin@teleimport.com / admin123");

// -----------------------------------------------
// PROMOCIONES DE EJEMPLO
// -----------------------------------------------
db.prepare(`
  INSERT INTO promotions (code, name, description, type, value, min_order_amount, max_uses, is_active, valid_from, valid_until)
  VALUES
    ('BIENVENIDO10', 'Bienvenida 10% OFF', 'Descuento del 10% en tu primera compra', 'percentage', 10, 50000, 100, 1, '2024-01-01', '2025-12-31'),
    ('ENVIOGRATIS', 'Envío Gratis', 'Envío sin costo en compras mayores a $200.000', 'free_shipping', 0, 200000, NULL, 1, '2024-01-01', NULL),
    ('TELE20', 'Tele Import 20% OFF', 'Promoción especial 20% en toda la tienda', 'percentage', 20, 100000, 50, 1, '2024-06-01', '2024-12-31')
`).run();
console.log("[Seed] Promociones de ejemplo creadas.");

console.log("\n[Seed] ✅ Base de datos inicializada correctamente.");
db.close();
