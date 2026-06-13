import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Renombrado en Next.js 16: middleware → proxy.
export async function proxy(req: NextRequest) {
  // 1) i18n routing: cuando la URL es exactamente "/", redirigimos a /ca por
  //    defecto, salvo si el navegador del usuario pide explícitamente español
  //    en el Accept-Language (en cuyo caso lo mandamos a /es).
  if (req.nextUrl.pathname === "/") {
    const acceptLang = req.headers.get("accept-language") ?? "";
    // El primer idioma de la cabecera con prefijo "es" → preferimos ES.
    const first = acceptLang.split(",")[0]?.trim().toLowerCase() ?? "";
    const target = first.startsWith("es") ? "/es" : "/ca";
    return NextResponse.redirect(new URL(target, req.url));
  }

  const response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresca la sesión Supabase si está a punto de caducar.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|og|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
