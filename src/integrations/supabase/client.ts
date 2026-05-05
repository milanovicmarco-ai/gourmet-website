// Browser-side Supabase client. Use in Client Components.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient<Database>(url, anonKey);

// Helper for components that prefer a factory.
export const createClient = () => supabase;
