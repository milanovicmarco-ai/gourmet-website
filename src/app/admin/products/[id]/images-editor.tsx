"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, RefreshCw } from "lucide-react";
import { uploadProductImage } from "../actions";

interface ImagesEditorProps {
  productRef: string;
  imageUrl: string | null;
}

export function ImagesEditor({ productRef, imageUrl: initialUrl }: ImagesEditorProps) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadProductImage(productRef, fd);
      // Cache-bust por si la URL es la misma (Cloudinary mantiene el public_id):
      const fresh = `${result.image_url}?v=${Date.now()}`;
      setImageUrl(fresh);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display font-medium text-lg">Imagen del producto</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground rounded-full px-4 py-2 hover:bg-accent transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : imageUrl ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {imageUrl ? "Sustituir" : "Subir"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {imageUrl ? (
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-secondary border border-border max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="block w-full max-w-md rounded-2xl border-2 border-dashed border-border py-12 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
        >
          Pulsa para subir una imagen
        </button>
      )}

      <p className="text-xs text-muted-foreground">
        Formatos aceptados: JPEG, PNG, WebP, AVIF (≤ 10 MB). Cada producto tiene una sola
        imagen principal; al subir una nueva se reemplaza la anterior automáticamente.
      </p>
    </div>
  );
}
