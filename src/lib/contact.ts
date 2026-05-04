export const WHATSAPP_NUMBER = "34621181160";
export const WHATSAPP_DISPLAY = "+34 621 181 160";
export const PHONE_FIXED = "973 248 266";
export const EMAIL = "hola@aurellano.com";
export const INSTAGRAM = "https://instagram.com/aurellano1968";
export const INSTAGRAM_HANDLE = "@aurellano1968";
export const ADDRESS = "Lleida, Catalunya";

export const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

export const WHATSAPP_LINK = waLink(
  "Hola Aurellano, me gustaría recibir información sobre vuestro catálogo."
);
