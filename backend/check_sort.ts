import db from "./src/db/database";

const rows = db.prepare(`
  SELECT 
    name, 
    stock_quantity, 
    price,
    compare_price,
    CASE WHEN compare_price > price 
      THEN ROUND((compare_price - price) * 100.0 / compare_price) 
      ELSE 0 
    END as discount_pct
  FROM products 
  WHERE is_active = 1 
  ORDER BY 
    CASE WHEN stock_quantity > 0 THEN 0 ELSE 1 END ASC,
    CASE WHEN compare_price > price THEN (compare_price - price) * 1.0 / compare_price ELSE 0 END DESC,
    created_at DESC
`).all() as { name: string; stock_quantity: number; price: number; compare_price: number | null; discount_pct: number }[];

console.log("\n=== Orden final de productos ===");
console.log("Stock | Desc%  | Nombre");
console.log("------+--------+-----------------------------------------");
rows.forEach((r) => {
  const stock = String(r.stock_quantity).padStart(5);
  const disc  = (String(r.discount_pct) + "%").padStart(6);
  console.log(`${stock} | ${disc} | ${r.name}`);
});
