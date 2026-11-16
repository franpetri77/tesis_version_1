import type { Metadata } from "next";
import { PedidoDetalle } from "./PedidoDetalle";

export const metadata: Metadata = { title: "Detalle del pedido" };

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  return <PedidoDetalle orderId={params.id} />;
}
