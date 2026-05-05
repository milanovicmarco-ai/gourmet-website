"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage, deleteProductImage } from "@/lib/pim/storage";
import { cn } from "@/lib/utils";

interface ImagesEditorProps {
  productId: string;
  initialPrimary: string | null;
  initialGallery: string[];
}

export function ImagesEditor({ productId, initialPrimary, initialGallery }: ImagesEditorProps) {
  const router = useRouter();
  const [primary, setPrimary] = useState<string | null>(initialPrimary);
  const [gallery, setGallery] = useState<string[]>(initialGallery ?? []);
  const [busy, setBusy] = useState<null | "upload" | "save" | string>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allImages = [primary, ...gallery].filter((u): u is string => !!u);

  async function persist(next: { primary: string | null; gallery: string[] }) {
    setBusy("save");
    setError(null);
    const { error } = await supabase
      .from("products")
      .update({ primary_image: next.primary, gallery: next.gallery })
      .eq("id", productId);
    setBusy(null);
    if (error) {
      setError(error.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy("upload");
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadProductImage(productId, file);
        urls.push(url);
      }
      const nextPrimary = primary ?? urls[0];
      const nextGallery = primary
        ? [...gallery, ...urls]
        : [...gallery, ...urls.slice(1)];
      setPrimary(nextPrimary);
      setGallery(nextGallery);
      await persist({ primary: nextPrimary, gallery: nextGallery });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function setAsPrimary(url: string) {
    if (url === primary) return;
    const newGallery = [primary, ...gallery].filter((u): u is string => !!u && u !== url);
    setPrimary(url);
    setGallery(newGallery);
    await persist({ primary: url, gallery: newGallery });
  }

  async function removeImage(url: string) {
    if (!confirm("¿Eliminar esta imagen? La acción no se puede deshacer.")) return;
    setBusy(url);
    try {
      await deleteProductImage(url);
      let nextPrimary = primary;
      let nextGallery = gallery;
      if (url === primary) {
        nextPrimary = gallery[0] ?? null;
        nextGallery = gallery.slice(1);
      } else {
        nextGallery = gallery.filter((u) => u !== url);
      }
      setPrimary(nextPrimary);
      setGallery(nextGallery);
      await persist({ primary: nextPrimary, gallery: nextGallery });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-medium text-lg">Imágenes</h3>
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
          Subir
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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

      {allImages.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="block w-full rounded-2xl border-2 border-dashed border-border py-12 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
        >
          Arrastra o haz clic para subir imágenes
        </button>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {allImages.map((url) => {
            const isPrimary = url === primary;
            const isBusy = busy === url;
            return (
              <li
                key={url}
                className={cn(
                  "relative aspect-square rounded-2xl overflow-hidden bg-secondary group",
                  isPrimary && "ring-2 ring-accent",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  {isPrimary ? (
                    <span className="self-start bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
                      Principal
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(url)}
                      disabled={!!busy}
                      className="self-start bg-background/90 text-foreground rounded-full px-2 py-1 text-[11px] inline-flex items-center gap-1 hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                      title="Marcar como imagen principal"
                    >
                      <Star className="h-3 w-3" /> Principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    disabled={!!busy}
                    className="self-end bg-destructive/90 text-destructive-foreground rounded-full p-1.5 hover:bg-destructive transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        La primera imagen marcada como <strong>Principal</strong> se usa en listados y como portada.
        El resto forma la galería del producto.
      </p>
    </div>
  );
}
