export const WHATSAPP_NUMBER = "34621228811";
export const WHATSAPP_DISPLAY = "+34 621 228 811";
export const PHONE_FIXED = "973 248 266";
export const EMAIL = "hola@aurellano.com";
export const INSTAGRAM = "https://instagram.com/aurellano1968";
export const INSTAGRAM_HANDLE = "@aurellano1968";
export const ADDRESS = "Carrer de les Valls d'Andorra, 52, 25005 Lleida";
export const ADDRESS_STREET = "Carrer de les Valls d'Andorra, 52";
export const ADDRESS_POSTAL = "25005";
export const ADDRESS_CITY = "Lleida";
export const ADDRESS_REGION = "Catalunya";
export const ADDRESS_COUNTRY = "ES";
export const GOOGLE_BUSINESS_URL = "https://maps.app.goo.gl/VbHPYXEZtijvx3JJ9";

export const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

export const WHATSAPP_LINK = waLink(
  "Hola Aurellano, me gustaría recibir información sobre vuestro catálogo."
);
