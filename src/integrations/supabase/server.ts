// Server-side Supabase client. Use in Server Components, Route Handlers, Server Actions.
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies. The middleware refreshes the session.
          }
        },
      },
    }
  );
}

/** Cliente Supabase de SOLO LECTURA PÚBLICA. NO lee cookies, así que —a
 *  diferencia de createClient()— no expulsa a la página del prerender
 *  estático/ISR de Next (leer cookies fuerza render dinámico en cada visita).
 *  Úsalo para datos públicos que no dependen de la sesión: catálogos, familias
 *  y metadatos de producto. Con la anon key respeta el RLS de lectura pública
 *  exactamente igual que el cliente con cookies cuando no hay sesión, que es el
 *  caso del escaparate público. */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
