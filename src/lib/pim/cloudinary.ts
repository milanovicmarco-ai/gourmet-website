// Transformaciones de Cloudinary para servir imágenes del tamaño que se pintan.
// Las URLs de la API apuntan al ORIGINAL (a veces PNG de varios MB); insertando
// `w_X,f_auto,q_auto` Cloudinary devuelve AVIF/WebP redimensionado (~15 KB).
// La transformación la hace y cachea Cloudinary: no consume cuota de Vercel.

const MARKER = "/image/upload/";

/** URL de Cloudinary con ancho `w`. Si no es de Cloudinary (o ya está
 *  transformada) la devuelve tal cual. */
export function cldImage(url: string, w: number): string {
  const i = url.indexOf(MARKER);
  if (i === -1 || !url.includes("res.cloudinary.com")) return url;
  const rest = url.slice(i + MARKER.length);
  // Ya transformada: el primer segmento no es una versión (v123…) ni una carpeta.
  if (/^[a-z]_[^/]+(,[^/]+)*\//.test(rest)) return url;
  return `${url.slice(0, i + MARKER.length)}w_${w},c_limit,f_auto,q_auto/${rest}`;
}

/** `srcSet` con varios anchos para que el navegador elija el más cercano. */
export function cldSrcSet(url: string, widths: number[]): string | undefined {
  if (!url.includes("res.cloudinary.com")) return undefined;
  return widths.map((w) => `${cldImage(url, w)} ${w}w`).join(", ");
}
