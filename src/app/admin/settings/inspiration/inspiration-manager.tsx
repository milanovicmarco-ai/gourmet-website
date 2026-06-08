"use client";

import { useState, useTransition, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Upload,
  Trash2,
  Edit2,
  ExternalLink,
  Loader2,
  Check,
  X,
} from "lucide-react";
import {
  createInspirationCatalog,
  updateInspirationCatalog,
  deleteInspirationCatalog,
  toggleInspirationCatalogActive,
} from "./actions";
import type { InspirationCatalog } from "@/lib/pim/inspiration";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Subida directa navegador → Supabase Storage. Evita el límite de 4.5 MB que
// Vercel impone al cuerpo de las Server Actions: el archivo nunca pasa por el
// servidor. El cliente ya está autenticado con la sesión del admin y las policies
// del bucket permiten escritura a usuarios `authenticated`. Las Server Actions
// solo reciben las URLs públicas resultantes (texto).
// ─────────────────────────────────────────────────────────────────────────────
const BUCKET = "inspiration";

const sanitizeFilename = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

async function uploadToBucket(file: File, folder: "pdfs" | "covers" | "logos"): Promise<string> {
  const ts = Date.now();
  const safeName = sanitizeFilename(file.name) || `file-${ts}`;
  const path = `${folder}/${ts}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir ${file.name}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error(`No se pudo generar la URL pública de ${file.name}`);
  return data.publicUrl;
}

/**
 * Sube los archivos del formulario (PDF/carátula/logo) directamente a Storage y
 * devuelve un FormData con sus URLs (texto), listo para la Server Action.
 * Mantiene title/sort_order/active y valida el tipo de PDF en cliente.
 */
async function buildPayload(fd: FormData): Promise<FormData> {
  const out = new FormData();
  out.set("title", String(fd.get("title") ?? "").trim());
  out.set("sort_order", String(fd.get("sort_order") ?? "0"));
  out.set("active", fd.get("active") === "1" ? "1" : "0");

  const pdf = fd.get("pdf");
  const cover = fd.get("cover");
  const logo = fd.get("logo");

  if (pdf instanceof File && pdf.size > 0) {
    if (pdf.type && !pdf.type.includes("pdf")) throw new Error("El archivo PDF debe ser un .pdf");
    out.set("pdf_url", await uploadToBucket(pdf, "pdfs"));
  }
  if (cover instanceof File && cover.size > 0) {
    out.set("cover_url", await uploadToBucket(cover, "covers"));
  }
  if (logo instanceof File && logo.size > 0) {
    out.set("logo_url", await uploadToBucket(logo, "logos"));
  }
  return out;
}

export function InspirationManager({ items }: { items: InspirationCatalog[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" /> Subir catálogo
          </button>
        )}
      </div>

      {showCreate && (
        <CatalogForm
          mode="create"
          onCancel={() => setShowCreate(false)}
          onSubmit={async (fd) => {
            try {
              await createInspirationCatalog(await buildPayload(fd));
              setMessage({ kind: "ok", text: "Catálogo creado." });
              setShowCreate(false);
              router.refresh();
            } catch (e) {
              setMessage({ kind: "err", text: (e as Error).message });
            }
          }}
          pending={pending}
          startTransition={startTransition}
        />
      )}

      {items.length === 0 && !showCreate ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No hay catálogos todavía. Pulsa &ldquo;Subir catálogo&rdquo; para empezar.
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-5 ${
                  c.active ? "border-border bg-background" : "border-border bg-secondary/30 opacity-70"
                }`}
              >
                {isEditing ? (
                  <CatalogForm
                    mode="edit"
                    initial={c}
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (fd) => {
                      try {
                        await updateInspirationCatalog(c.id, await buildPayload(fd));
                        setMessage({ kind: "ok", text: "Catálogo actualizado." });
                        setEditingId(null);
                        router.refresh();
                      } catch (e) {
                        setMessage({ kind: "err", text: (e as Error).message });
                      }
                    }}
                    pending={pending}
                    startTransition={startTransition}
                  />
                ) : (
                  <div className="flex flex-wrap items-start gap-5">
                    {/* Cover thumbnail */}
                    <div className="w-24 h-32 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.cover_url}
                        alt={c.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-medium text-lg">{c.title}</h3>
                        <span className="text-xs text-muted-foreground">orden #{c.sort_order}</span>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await toggleInspirationCatalogActive(c.id, !c.active);
                                router.refresh();
                              } catch (e) {
                                setMessage({ kind: "err", text: (e as Error).message });
                              }
                            })
                          }
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border ${
                            c.active
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : "bg-secondary text-muted-foreground border-border"
                          }`}
                        >
                          {c.active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {c.active ? "Activo" : "Inactivo"}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <a
                          href={c.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-accent"
                        >
                          <ExternalLink className="h-3 w-3" /> PDF
                        </a>
                        <a
                          href={c.cover_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-accent"
                        >
                          <ExternalLink className="h-3 w-3" /> Carátula
                        </a>
                        {c.logo_url && (
                          <a
                            href={c.logo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-accent"
                          >
                            <ExternalLink className="h-3 w-3" /> Logo
                          </a>
                        )}
                      </div>
                    </div>

                    {c.logo_url && (
                      <div className="h-12 w-24 grid place-items-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.logo_url}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingId(c.id)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-foreground disabled:opacity-50"
                      >
                        <Edit2 className="h-3 w-3" /> Editar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`¿Eliminar "${c.title}"?`)) return;
                          startTransition(async () => {
                            try {
                              await deleteInspirationCatalog(c.id);
                              setMessage({ kind: "ok", text: "Catálogo eliminado." });
                              router.refresh();
                            } catch (e) {
                              setMessage({ kind: "err", text: (e as Error).message });
                            }
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-destructive/30 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/5 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" /> Borrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form (compartido entre create y edit)
// ─────────────────────────────────────────────────────────────────────────────

function CatalogForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  pending,
  startTransition,
}: {
  mode: "create" | "edit";
  initial?: InspirationCatalog;
  onSubmit: (fd: FormData) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Si el toggle "Activo" no está marcado, FormData no incluye la key. Forzamos "0".
    if (!fd.has("active")) fd.set("active", "0");
    startTransition(async () => {
      await onSubmit(fd);
    });
  }

  return (
    <form ref={formRef} onSubmit={handle} className="space-y-5">
      <div className="grid sm:grid-cols-[1fr_120px_auto] gap-4 items-end">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Título</span>
          <input
            type="text"
            name="title"
            defaultValue={initial?.title ?? ""}
            required
            placeholder="Selección Aurellano 2025"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Orden</span>
          <input
            type="number"
            name="sort_order"
            defaultValue={initial?.sort_order ?? 0}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer h-[42px]">
          <input
            type="checkbox"
            name="active"
            value="1"
            defaultChecked={initial?.active ?? true}
            className="h-4 w-4 accent-accent"
          />
          Activo
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <FileField
          label="PDF"
          name="pdf"
          accept="application/pdf,.pdf"
          required={mode === "create"}
          hint={mode === "edit" && initial?.pdf_url ? "Subir para reemplazar" : "Obligatorio"}
        />
        <FileField
          label="Carátula (imagen)"
          name="cover"
          accept="image/*"
          required={mode === "create"}
          hint={mode === "edit" && initial?.cover_url ? "Subir para reemplazar" : "Obligatorio"}
        />
        <FileField
          label="Logo (opcional)"
          name="logo"
          accept="image/*"
          required={false}
          hint={mode === "edit" && initial?.logo_url ? "Subir para reemplazar" : "Opcional"}
        />
      </div>

      <div className="flex gap-3 pt-2 border-t border-border">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {mode === "create" ? "Subir" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FileField({
  label,
  name,
  accept,
  required,
  hint,
}: {
  label: string;
  name: string;
  accept: string;
  required: boolean;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-[10px] text-muted-foreground/80">{hint}</span>}
      </span>
      <input
        type="file"
        name={name}
        accept={accept}
        required={required}
        className="block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent/10 file:cursor-pointer"
      />
    </label>
  );
}
