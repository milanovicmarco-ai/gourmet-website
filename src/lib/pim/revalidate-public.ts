"use server";

// Helper compartido por las server actions del PIM para invalidar el cache
// de las páginas PÚBLICAS afectadas por una edición. Crítico tras el
// refactor i18n: ahora existen DOS variantes de cada URL pública (ES y CA)
// y antes solo revalidábamos las viejas (/catalogo, /producto/{slug}) que
// ya no existen como rutas reales. Sin esto, una edición en el PIM tardaba
// hasta 1h en reflejarse en producción.

import { revalidatePath } from "next/cache";

/** Invalida los listados públicos (catálogo + secciones que listan
 * productos). Llamar siempre que algo que se renderiza en esas listas
 * cambie: nombre, marca, familia, precio, asignación a catálogo, etc. */
export async function revalidatePublicListings(): Promise<void> {
  // Catálogos en sus dos variantes de URL.
  revalidatePath("/es/catalogo");
  revalidatePath("/ca/cataleg");
  // Secciones temáticas (cada una lista un subconjunto del catálogo).
  revalidatePath("/es/quesos");
  revalidatePath("/ca/formatges");
  revalidatePath("/es/foie");
  revalidatePath("/ca/foie");
  revalidatePath("/es/colmado");
  revalidatePath("/ca/rebost");
  revalidatePath("/es/despensa");
  revalidatePath("/ca/rebost-sec");
  revalidatePath("/es/especial-sin");
  revalidatePath("/ca/especial-sense");
}

/** Invalida la URL pública de un producto concreto en ambos idiomas.
 * Llamar tras cualquier edición que afecte al render del detalle:
 * traducciones, meta, imagen, descripción, etc. */
export async function revalidatePublicProduct(slug: string | null | undefined): Promise<void> {
  if (!slug) return;
  revalidatePath(`/es/producto/${slug}`);
  revalidatePath(`/ca/producte/${slug}`);
  // Legacy: por si algún link antiguo todavía apunta sin prefijo.
  revalidatePath(`/producto/${slug}`);
}

/** Bundle: lista + producto en un solo go. Conveniencia para los updates
 * que afectan a ambos (lo más habitual). */
export async function revalidatePublicAll(slug: string | null | undefined): Promise<void> {
  await revalidatePublicListings();
  await revalidatePublicProduct(slug);
}
