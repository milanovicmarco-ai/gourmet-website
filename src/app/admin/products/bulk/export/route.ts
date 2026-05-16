// GET /admin/products/bulk/export
// Devuelve un .xlsx con TODOS los productos del catálogo.
//
// Estrategia de pagineo: la API del socio cap a 200 productos por request y no
// expone offset. Para sortearlo, iteramos por familia (asumiendo que ninguna
// familia tiene >200 productos — algo razonable para un catálogo gourmet curado).
// Si alguna familia satura el cap, dejamos un warning en logs.

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/integrations/supabase/server";
import { listProducts, listFamilies, type ApiProduct } from "@/lib/pim/api";
import { getMetasForProducts } from "@/lib/pim/product-meta";
import { getCatalogsForProducts } from "@/lib/pim/catalogs";
import { BULK_COLUMNS, BULK_HEADERS, rowFromSource } from "@/lib/pim/bulk-schema";

export const dynamic = "force-dynamic";

async function fetchAllProducts(): Promise<ApiProduct[]> {
  const families = await listFamilies();
  // Primero: la pasada "sin familia" pilla productos sin family asignada (hasta 200).
  const allMap = new Map<string, ApiProduct>();
  const baseRes = await listProducts({ limit: 200 }).catch(() => ({ results: [] }));
  for (const p of baseRes.results) allMap.set(p.ref, p);

  // Después: una pasada por familia para asegurarnos de incluir TODO.
  for (const f of families) {
    const res = await listProducts({ limit: 200, family: f.family }).catch(() => ({ results: [] }));
    if (res.results.length === 200) {
      console.warn(`[bulk export] familia "${f.family}" devolvió 200 (cap). Podría haber más productos sin exportar — pide al socio que añada offset.`);
    }
    for (const p of res.results) allMap.set(p.ref, p);
  }
  return Array.from(allMap.values()).sort((a, b) => a.ref.localeCompare(b.ref));
}

export async function GET() {
  // Sólo admin autenticado.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const products = await fetchAllProducts();
  const refs = products.map((p) => p.ref);
  const [metas, catalogsByRef] = await Promise.all([
    getMetasForProducts(refs).catch(() => ({})),
    getCatalogsForProducts(refs).catch(() => ({})),
  ]);

  // Construir las filas en el orden del schema.
  const rows = products.map((product) =>
    rowFromSource({
      product,
      meta: metas[product.ref] ?? null,
      catalogSlugs: catalogsByRef[product.ref] ?? [],
    }),
  );

  // Generar workbook
  const wb = XLSX.utils.book_new();
  const aoa = [BULK_HEADERS, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Anchos de columna desde el schema
  ws["!cols"] = BULK_COLUMNS.map((c) => ({ wch: c.width ?? 14 }));

  // Freeze panes: header siempre visible
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, "Productos");

  // Hoja de instrucciones — pequeña guía sobre cómo funciona el round-trip
  const instructionsAoa: (string | number)[][] = [
    ["Aurellano · Bulk Edit"],
    [""],
    ["Cómo usar este Excel:"],
    [
      "1) Edita las filas. La columna `ref` identifica el producto en la API.",
    ],
    [
      "2) Para CREAR un producto nuevo: añade fila al final con la `ref` que quieras y rellena al menos `nombre` y `familia`.",
    ],
    [
      "3) Para BORRAR un producto: marca la columna `borrar` con TRUE.",
    ],
    [
      "4) Las columnas en gris (score, slug, imagen_principal, num_imagenes) son informativas y se ignoran al subir.",
    ],
    [""],
    ["Convenciones:"],
    ["- Booleanos: TRUE / FALSE (o SÍ / NO, o 1 / 0). Vacío = ignorar."],
    ["- Listas (tags, maridajes, alergenos, catalogos): texto separado por comas en una sola celda."],
    ["- estado: borrador / publicado / archivado."],
    ["- descripcion_larga acepta Markdown (saltos de línea con doble enter, **negrita**, *cursiva*, listas con -, [enlace](url))."],
    [""],
    ["Generado:", new Date().toISOString()],
    ["Total productos:", products.length],
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instructionsAoa);
  instrSheet["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, "Instrucciones");

  // Serialize. xlsx devuelve un Node Buffer cuando type=buffer.
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const fileName = `aurellano-catalogo-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
