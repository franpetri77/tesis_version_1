// =============================================
// CATEGORÍAS DE LA TIENDA
// Fuente única para el menú "Categorías" del header y la sección de
// categorías del inicio. Slugs alineados con la tabla `categories` de la DB:
// televisores | smartphones | laptops-pcs | audio-video | gaming |
// linea-blanca | pequenos-electro | accesorios
// =============================================

import {
  Tv, Smartphone, Laptop, Headphones, Gamepad2, Refrigerator, Microwave, Mouse,
  type LucideIcon,
} from "lucide-react";

export interface StoreCategory {
  label: string;
  desc:  string;
  href:  string;
  icon:  LucideIcon;
}

export const STORE_CATEGORIES: StoreCategory[] = [
  { label: "Televisores",      desc: "Smart TV, 4K, OLED y QLED",               href: "/catalogo?categoria=televisores",      icon: Tv },
  { label: "Smartphones",      desc: "Celulares de todas las marcas",           href: "/catalogo?categoria=smartphones",      icon: Smartphone },
  { label: "Laptops y PCs",    desc: "Computadoras portátiles y de escritorio", href: "/catalogo?categoria=laptops-pcs",      icon: Laptop },
  { label: "Audio y Video",    desc: "Auriculares, parlantes y soundbars",      href: "/catalogo?categoria=audio-video",      icon: Headphones },
  { label: "Gaming",           desc: "Consolas, videojuegos y accesorios",      href: "/catalogo?categoria=gaming",           icon: Gamepad2 },
  { label: "Línea Blanca",     desc: "Heladeras, lavarropas y cocinas",         href: "/catalogo?categoria=linea-blanca",     icon: Refrigerator },
  { label: "Pequeños Electro", desc: "Licuadoras, cafeteras y planchas",        href: "/catalogo?categoria=pequenos-electro", icon: Microwave },
  { label: "Accesorios",       desc: "Mouse, teclados, monitores y más",        href: "/catalogo?categoria=accesorios",       icon: Mouse },
];
