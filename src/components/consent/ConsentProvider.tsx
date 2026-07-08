"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
  CONSENT_COOKIE,
  CONSENT_COOKIE_MAX_AGE,
  parseConsentCookie,
  serializeConsentCookie,
  type ConsentState,
} from "@/lib/consent";
import { loadGtm, pushConsentUpdate } from "./gtm";

interface ConsentCtx {
  /** null = todavía sin decisión del usuario → hay que mostrar el banner. */
  consent: ConsentState | null;
  preferencesOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (state: ConsentState) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const Ctx = createContext<ConsentCtx | null>(null);

// En cliente usamos useLayoutEffect para leer la cookie ANTES del primer
// pintado (evita el parpadeo del banner en visitantes que ya habían decidido).
// En SSR no existe layout effect, así que caemos a useEffect (no-op en servidor).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readConsentCookie(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return parseConsentCookie(match ? decodeURIComponent(match[1]) : undefined);
}

export function ConsentProvider({ children, gtmId }: { children: ReactNode; gtmId?: string }) {
  // Empieza en null tanto en servidor como en cliente (mismo HTML en la
  // hidratación); se corrige de inmediato en el cliente vía layout effect.
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const stored = readConsentCookie();
    if (stored) {
      setConsent(stored);
      pushConsentUpdate(stored);
      if ((stored.analytics || stored.marketing) && gtmId) {
        loadGtm(gtmId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyConsent = useCallback(
    (next: ConsentState) => {
      setConsent(next);
      const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
        serializeConsentCookie(next)
      )}; max-age=${CONSENT_COOKIE_MAX_AGE}; path=/; SameSite=Lax${secure}`;

      pushConsentUpdate(next);
      if ((next.analytics || next.marketing) && gtmId) {
        loadGtm(gtmId);
      }
      setPreferencesOpen(false);
    },
    [gtmId]
  );

  const acceptAll = useCallback(() => applyConsent({ analytics: true, marketing: true }), [applyConsent]);
  const rejectAll = useCallback(() => applyConsent({ analytics: false, marketing: false }), [applyConsent]);
  const savePreferences = useCallback((state: ConsentState) => applyConsent(state), [applyConsent]);
  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  return (
    <Ctx.Provider
      value={{ consent, preferencesOpen, acceptAll, rejectAll, savePreferences, openPreferences, closePreferences }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useConsent(): ConsentCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider");
  return ctx;
}
