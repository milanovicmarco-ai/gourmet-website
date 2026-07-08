// Estado de consentimiento de cookies (RGPD/LOPDGDD) — fuente de verdad para
// el banner, el panel de preferencias y la carga condicional de Google Tag Manager.
//
// Solo existen dos categorías configurables: "necessary" no se pregunta (no hay
// cookies no esenciales de esa categoría hoy), así que el estado persistido
// cubre analítica y marketing.

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

export const CONSENT_COOKIE = "aurellano_consent";

// ~12 meses, techo recomendado por la AEPD para no perpetuar un consentimiento.
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Súbelo si cambia el conjunto de cookies/categorías y hay que re-preguntar
// a quien ya había dado su consentimiento con el esquema anterior.
export const CONSENT_VERSION = 1;

interface StoredConsent extends ConsentState {
  v: number;
}

export function parseConsentCookie(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.v !== CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null;
    return { analytics: parsed.analytics, marketing: parsed.marketing };
  } catch {
    return null;
  }
}

export function serializeConsentCookie(state: ConsentState): string {
  const stored: StoredConsent = { v: CONSENT_VERSION, ...state };
  return JSON.stringify(stored);
}
