import { apiFetch } from "./client";
import { getAdminToken } from "./admin";
import type { PromotionType } from "@/types";

export interface PromotionInput {
  code: string; name: string; description: string | null; type: PromotionType;
  value: number; min_order_amount: number | null; max_uses: number | null;
  is_active: boolean; valid_from: string; valid_until: string | null;
}
export interface AdminPromotion extends PromotionInput { id: string; current_uses: number }
export async function listPromotions(signal?: AbortSignal) {
  return (await apiFetch<AdminPromotion[]>("/admin/promotions", {token:getAdminToken(),cache:"no-store",signal})).data;
}
export async function savePromotion(id: string | null, input: PromotionInput) {
  return (await apiFetch<AdminPromotion>(id ? `/admin/promotions/${encodeURIComponent(id)}` : "/admin/promotions", {
    method:id ? "PUT" : "POST", token:getAdminToken(), body:JSON.stringify(input),
  })).data;
}
export async function setPromotionActive(id: string, is_active: boolean) {
  return (await apiFetch<AdminPromotion>(`/admin/promotions/${encodeURIComponent(id)}/active`, {
    method:"PATCH",token:getAdminToken(),body:JSON.stringify({is_active}),
  })).data;
}
