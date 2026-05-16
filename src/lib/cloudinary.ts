// Helper para reescribir URLs de Cloudinary con transformaciones de tamaño/recorte.
// Si la URL no es de Cloudinary, la devuelve tal cual.
//
// Doc de transformaciones: https://cloudinary.com/documentation/transformation_reference

type CloudinaryOpts = {
  width?: number;
  height?: number;
  /**
   * Modo de ajuste:
   *  - "pad"  → fit dentro de width×height, padding del color auto-detectado.
   *  - "fit"  → fit dentro, fondo transparente.
   *  - "fill" → rellena width×height recortando lo necesario (gravity auto).
   *  - "limit" → respeta proporción, no amplía si la original es más pequeña.
   */
  fit?: "pad" | "fit" | "fill" | "limit";
  /** Calidad/formato adaptativos por defecto: WebP/AVIF según navegador, calidad auto. */
  autoFormat?: boolean;
};

export function cloudinaryUrl(url: string | null | undefined, opts: CloudinaryOpts = {}): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com")) return url;

  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const parts: string[] = [];
  if (opts.autoFormat !== false) {
    parts.push("f_auto", "q_auto");
  }
  if (opts.fit) {
    parts.push(`c_${opts.fit}`);
    if (opts.fit === "pad") parts.push("b_auto");
    if (opts.fit === "fill") parts.push("g_auto");
  }
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);

  if (parts.length === 0) return url;

  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length);

  // Evita duplicar transformaciones si la URL ya las trae
  return `${before}${parts.join(",")}/${after}`;
}
