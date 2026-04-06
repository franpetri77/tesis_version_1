"use client";

// =============================================
// PÁGINA ADMIN: NUEVO PRODUCTO
// Formulario para crear un producto en el catálogo.
// Envía los datos al backend con autenticación JWT.
// =============================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { createProduct } from "@/lib/api/admin";
import type { Category } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// -----------------------------------------------
// Estructura de una imagen en el formulario
// -----------------------------------------------
interface ImageField {
  url: string;
  alt: string;
}

export default function NewProductPage() {
  const router = useRouter();

  // Estado del formulario
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<ImageField[]>([{ url: "", alt: "" }]);

  // Estado de UI
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Cargar categorías al montar
  useEffect(() => {
    fetch(`${API_URL}/catalog/categories`)
      .then((r) => r.json())
      .then((data: { data: Category[] }) => setCategories(data.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  // -----------------------------------------------
  // Manejo de campos de imágenes
  // -----------------------------------------------
  function updateImage(idx: number, field: keyof ImageField, value: string) {
    setImages((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function addImageField() {
    if (images.length < 3) {
      setImages((prev) => [...prev, { url: "", alt: "" }]);
    }
  }

  function removeImageField(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // -----------------------------------------------
  // Envío del formulario
  // -----------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !sku.trim() || !price || !categoryId) {
      setError("Nombre, SKU, precio y categoría son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      // Filtrar imágenes con URL vacía
      const validImages = images
        .filter((img) => img.url.trim() !== "")
        .map((img) => ({ url: img.url.trim(), alt: img.alt.trim() || undefined }));

      await createProduct({
        name: name.trim(),
        sku: sku.trim(),
        price: parseFloat(price),
        compare_price: comparePrice ? parseFloat(comparePrice) : undefined,
        category_id: categoryId,
        stock_quantity: parseInt(stockQuantity, 10) || 0,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        short_description: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
        is_active: isActive,
        is_featured: isFeatured,
        images: validImages.length > 0 ? validImages : undefined,
      });

      // Redirigir al listado tras éxito
      router.push("/admin/productos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el producto");
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------
  // Clases reutilizables
  // -----------------------------------------------
  const inputClass =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/productos"
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nuevo producto</h1>
          <p className="text-sm text-slate-500 mt-0.5">Completá los datos del producto</p>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Información básica */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
            Información básica
          </h2>

          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Smart TV Samsung 55&quot;"
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>SKU *</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ej: SAM-TV55-4K"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Categoría *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Seleccioná una categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Marca</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ej: Samsung"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej: UN55AU7000GXZS"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Precios y stock */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
            Precio y stock
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Precio (ARS) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Precio antes de descuento</label>
              <input
                type="number"
                value={comparePrice}
                onChange={(e) => setComparePrice(e.target.value)}
                placeholder="0.00 (opcional)"
                min="0"
                step="0.01"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Stock inicial</label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="0"
                min="0"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
            Descripción
          </h2>

          <div>
            <label className={labelClass}>Descripción corta</label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Resumen del producto (1-2 oraciones)"
              rows={2}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Descripción completa</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción detallada del producto..."
              rows={5}
              className={inputClass}
            />
          </div>
        </div>

        {/* Imágenes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
            Imágenes (hasta 3)
          </h2>

          <div className="space-y-3">
            {images.map((img, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="url"
                    value={img.url}
                    onChange={(e) => updateImage(idx, "url", e.target.value)}
                    placeholder="URL de la imagen"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={img.alt}
                    onChange={(e) => updateImage(idx, "alt", e.target.value)}
                    placeholder="Texto alternativo (accesibilidad)"
                    className={inputClass}
                  />
                </div>
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(idx)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {images.length < 3 && (
            <button
              type="button"
              onClick={addImageField}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar imagen
            </button>
          )}
        </div>

        {/* Opciones */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
            Opciones
          </h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              Producto activo (visible en el catálogo)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              Producto destacado (aparece en la página de inicio)
            </span>
          </label>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Guardando..." : "Crear producto"}
          </button>
          <Link
            href="/admin/productos"
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors px-3 py-2.5"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
