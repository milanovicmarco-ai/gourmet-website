"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  Trash2,
  Star,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  addProductImage,
  removeProductImage,
  reorderProductImages,
  setPrimaryProductImage,
} from "../actions";
import { cn } from "@/lib/utils";

interface ImagesEditorProps {
  productRef: string;
  imageUrl: string | null;
  gallery?: string[];
}

export function ImagesEditor({ productRef, imageUrl, gallery }: ImagesEditorProps) {
  const router = useRouter();
  // Estado: lista ordenada de URLs (la primera es la principal).
  // Si la API devuelve gallery la usamos; si no, sintetizamos desde image_url.
  const initial =
    Array.isArray(gallery) && gallery.length > 0
      ? gallery
      : imageUrl
        ? [imageUrl]
        : [];
  const [items, setItems] = useState<string[]>(initial);
  const [busy, setBusy] = useState<null | "upload" | string>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy("upload");
    setError(null);
    try {
      let latest = items;
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await addProductImage(productRef, fd);
        latest = res.gallery ?? latest;
      }
      setItems(latest);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(url: string) {
    if (!confirm("¿Eliminar esta imagen del producto?")) return;
    setBusy(url);
    setError(null);
    try {
      const res = await removeProductImage(productRef, url);
      setItems(res.gallery ?? items.filter((u) => u !== url));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function makePrimary(url: string) {
    setBusy(url);
    setError(null);
    try {
      const res = await setPrimaryProductImage(productRef, url);
      setItems(res.gallery ?? [url, ...items.filter((u) => u !== url)]);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function move(url: string, dir: -1 | 1) {
    const idx = items.indexOf(url);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    setBusy(url);
    setError(null);
    try {
      const res = await reorderProductImages(productRef, next);
      setItems(res.gallery ?? next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      // Revert local
      setItems(items);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-display font-medium text-lg">Galería de imágenes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} foto{items.length !== 1 ? "s" : ""}
            {items.length > 0 && <> · la primera es la principal</>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy === "upload"}
          className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground rounded-full px-4 py-2 hover:bg-accent transition-colors disabled:opacity-60"
        >
          {busy === "upload" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Añadir foto{items.length === 0 ? "" : "s"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="block w-full rounded-2xl border-2 border-dashed border-border py-12 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
        >
          Pulsa para subir una o varias imágenes
        </button>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((url, idx) => {
            const isPrimary = idx === 0;
            const isBusy = busy === url;
            return (
              <li
                key={url}
                className={cn(
                  "group relative aspect-square rounded-2xl overflow-hidden bg-secondary border",
                  isPrimary ? "border-accent ring-2 ring-accent/30" : "border-border",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />

                {/* Badge principal */}
                {isPrimary && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-accent text-accent-foreground rounded-full px-2 py-0.5 font-semibold">
                    <Star className="h-3 w-3" /> Principal
                  </span>
                )}

                {/* Overlay con acciones */}
                <div
                  className={cn(
                    "absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex flex-col justify-between p-2",
                    isBusy && "bg-black/40",
                  )}
                >
                  {/* Flechas reordenar */}
                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => move(url, -1)}
                      disabled={idx === 0 || !!busy}
                      title="Mover izquierda"
                      className="h-7 w-7 grid place-items-center rounded-full bg-background/90 disabled:opacity-30 hover:bg-background transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(url, 1)}
                      disabled={idx === items.length - 1 || !!busy}
                      title="Mover derecha"
                      className="h-7 w-7 grid place-items-center rounded-full bg-background/90 disabled:opacity-30 hover:bg-background transition-colors"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Acciones inferiores */}
                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => makePrimary(url)}
                        disabled={!!busy}
                        title="Marcar como principal"
                        className="inline-flex items-center gap-1 text-[10px] bg-background/95 rounded-full px-2 py-1 hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Star className="h-3 w-3" /> Principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(url)}
                      disabled={!!busy}
                      title="Eliminar"
                      className="h-7 w-7 grid place-items-center rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive transition-colors ml-auto"
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Formatos: JPEG, PNG, WebP, AVIF (≤ 10 MB). Pasa el ratón sobre cada imagen
        para verla en grande y acceder a las acciones (reordenar, marcar como principal, eliminar).
      </p>
    </div>
  );
}
