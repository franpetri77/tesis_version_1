// =============================================
// PÁGINA: DETALLE DE PRODUCTO
// Muestra toda la información del producto: imágenes,
// descripción, precio, stock, tags y botón de compra.
// Generada estáticamente con revalidación (ISR).
// =============================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Tag, ChevronRight, CheckCircle2, XCircle, Truck, Store } from "lucide-react";
import { getProductBySlug, getAllProductSlugs, getProductImageUrl } from "@/lib/api/catalog";
import { formatPrice, calculateDiscount } from "@/lib/utils/format";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";

interface ProductPageProps {
  params: { slug: string };
}

// Genera metadata dinámica para SEO
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Producto no encontrado" };

  return {
    title: product.name,
    description: product.short_description ?? product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.short_description,
      images: product.images?.[0]
        ? [getProductImageUrl(product.images[0].image_url, { width: 800, height: 800 })]
        : [],
    },
  };
}

// Pre-genera páginas en build time (SSG)
export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const revalidate = 300;

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  // Ordenar imágenes por sort_order
  const sortedImages = [...(product.images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const mainImage = sortedImages[0];
  const discount  = product.compare_price
    ? calculateDiscount(product.compare_price, product.price)
    : 0;
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <div className="container-main py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-slate-600 transition-colors">Inicio</Link>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <Link href="/catalogo" className="hover:text-slate-600 transition-colors">Catálogo</Link>
        {product.category_slug && (
          <>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <Link
              href={`/catalogo?categoria=${product.category_slug}`}
              className="hover:text-slate-600 transition-colors"
            >
              {product.category_name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <span className="text-slate-600 font-medium line-clamp-1 max-w-[180px]">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        {/* ---- GALERÍA DE IMÁGENES ---- */}
        <ProductImageGallery
          images={sortedImages}
          productName={product.name}
          discount={discount}
        />

        {/* ---- INFORMACIÓN DEL PRODUCTO ---- */}
        <div className="space-y-5">
          {/* Categoría */}
          {product.category_slug && (
            <Link
              href={`/catalogo?categoria=${product.category_slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full transition-colors"
            >
              {product.category_name}
            </Link>
          )}

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug tracking-tight">
            {product.name}
          </h1>

          {/* SKU */}
          {product.sku && (
            <p className="text-xs text-slate-400">SKU: {product.sku}</p>
          )}

          {/* Precio */}
          <div className="flex items-baseline gap-3 py-2">
            <span className="text-3xl font-bold text-slate-900">
              {formatPrice(product.price)}
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <>
                <span className="text-lg text-slate-400 line-through font-normal">
                  {formatPrice(product.compare_price)}
                </span>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                  -{discount}% OFF
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            {isOutOfStock ? (
              <>
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm font-medium text-red-600">Sin stock disponible</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-emerald-700">
                  {product.stock_quantity <= 5
                    ? `¡Últimas ${product.stock_quantity} unidades!`
                    : `${product.stock_quantity} unidades disponibles`}
                </span>
              </>
            )}
          </div>

          {/* Descripción corta */}
          {product.short_description && (
            <p className="text-slate-600 text-sm leading-relaxed border-l-2 border-brand-200 pl-3">
              {product.short_description}
            </p>
          )}

          {/* Botón agregar al carrito (componente client) */}
          <AddToCartButton product={product} />

          {/* Beneficios de entrega */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Truck className="w-4 h-4 text-brand-500 flex-shrink-0" />
              Envío a todo el país
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Store className="w-4 h-4 text-brand-500 flex-shrink-0" />
              Retiro en sucursal
            </div>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Tag className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
              {product.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/catalogo?buscar=${tag.slug}`}
                  className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- DESCRIPCIÓN COMPLETA ---- */}
      {product.description && (
        <section className="mt-14 pt-10 border-t border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">
            Descripción del producto
          </h2>
          <div className="text-slate-600 text-sm leading-relaxed max-w-3xl whitespace-pre-line">
            {product.description}
          </div>
        </section>
      )}
    </div>
  );
}
