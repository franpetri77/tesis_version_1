"use client";

// =============================================
// PÁGINA ADMIN: EDITAR PRODUCTO
// Carga los datos del producto, permite editarlos,
// activar/desactivar y eliminar.
// =============================================

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";
import {
  getAdminProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
} from "@/lib/api/admin";
import type { Category, Product } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// -----------------------------------------------
// Estructura de una imagen en el formulario
// -----------------------------------------------
interface ImageField {
  url: string;
  alt: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // -----------------------------------------------
  // Cargar producto y categorías al montar
  // -----------------------------------------------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [product, catRes] = await Promise.all([
        getAdminProduct(productId),
        fetch(`${API_URL}/catalog/categories`)
          .then((r) => r.json())
          .then((d: { data: Category[] }) => d.data ?? []),
      ]);

      setCategories(catRes);
      populateForm(product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el producto");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function populateForm(product: Product) {
    setName(product.name ?? "");
    setSku(product.sku ?? "");
    setPrice(String(product.price ?? ""));
    setComparePrice(product.compare_price ? String(product.compare_price) : "");
    setCategoryId(product.category_id ?? "");
    setStockQuantity(String(product.stock_quantity ?? 0));
    setBrand(product.brand ?? "");
    setModel(product.model ?? "");
    setShortDescription(product.short_description ?? "");
    setDescription(product.description ?? "");
    setIsActive(Boolean(product.is_active));
    setIsFeatured(Boolean(product.is_featured));

    // Cargar imágenes existentes o un campo vacío
    if (product.images && product.images.length > 0) {
      setImages(
        product.images.map((img) => ({
          url: img.image_url ?? "",
          alt: img.alt_text ?? "",
        }))
      );
    } else {
      setImages([{ url: "", alt: "" }]);
    }
  }

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
  // Guardar cambios
  // -----------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !sku.trim() || !price || !categoryId) {
      setError("Nombre, SKU, precio y categoría son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const validImages = images
        .filter((img) => img.url.trim() !== "")
        .map((img) => ({ url: img.url.trim(), alt: img.alt.trim() || undefined }));

      await updateProduct(productId, {
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
        images: validImages,
      });

      setSuccess("Producto actualizado correctamente");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------
  // Toggle activo/inactivo
  // -----------------------------------------------
  async function handleToggle() {
    setToggling(true);
    setError("");
    try {
      const result = await toggleProduct(productId);
      setIsActive(result.is_active);
      setSuccess(`Producto ${result.is_active ? "activado" : "desactivado"}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar el estado");
    } finally {
      setToggling(false);
    }
  }

  // -----------------------------------------------
  // Eliminar producto
  // -----------------------------------------------
  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      await deleteProduct(productId);
      router.push("/admin/productos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el producto");
      setDeleting(false);
    }
  }

  // -----------------------------------------------
  // Clases reutilizables
  // -----------------------------------------------
  const inputClass =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  // Estado de carga inicial
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Cargando producto...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/productos"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Editar producto</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-mono">{sku}</p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2">
          {/* Toggle activar/desactivar */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            title={isActive ? "Desactivar producto" : "Activar producto"}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors disabled:opacity-60 ${
              isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isActive ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            {isActive ? "Activo" : "Inactivo"}
          </button>

          {/* Eliminar */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Eliminar
          </button>
        </div>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-sm text-emerald-700 font-medium">{success}</p>
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
              placeholder="Nombre del producto"
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
                placeholder="Código único del producto"
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
                placeholder="Marca del producto"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Modelo del producto"
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
              <label className={labelClass}>Stock</label>
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
              placeholder="Resumen del producto"
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
                    placeholder="Texto alternativo"
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

        {/* Acciones del formulario */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Guardando..." : "Guardar cambios"}
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
