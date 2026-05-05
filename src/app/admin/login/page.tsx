import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login · Aurellano PIM",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1.5 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Aurellano · PIM</p>
          <h1 className="font-display font-light text-3xl tracking-tight">Acceso interno</h1>
          <p className="text-sm text-muted-foreground">
            Sólo personal autorizado.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
