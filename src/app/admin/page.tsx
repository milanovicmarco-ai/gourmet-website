import { redirect } from "next/navigation";
import { createClient } from "@/integrations/supabase/server";

export default async function AdminIndexPage() {
  // Skip Supabase auth completamente cuando DEV_BYPASS_ADMIN_AUTH=1 — evita
  // el lookup DNS lento si el proyecto Supabase no está configurado.
  let user: { email?: string | null } | null = null;
  if (process.env.DEV_BYPASS_ADMIN_AUTH !== "1") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) redirect("/admin/login");
  }
  redirect("/admin/products");
}
