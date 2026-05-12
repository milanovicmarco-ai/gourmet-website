"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Trash2, GripVertical, Star, RotateCcw, Save } from "lucide-react";
import {
  addProductImage,
  removeProductImage,
  reorderProductImages,
} from "../actions";

interface ImagesEditorProps {
  productRef: string;
  gallery: string[];
}

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
};

/**
 * Galería staged: TODO se queda en estado local hasta pulsar "Guardar galería".
 *
 * Operaciones encoladas:
 *  - `existing`: URLs que ya están en backend, en su orden actual deseado
 *  - `toDelete`: URLs presentes en backend que vamos a borrar
 *  - `toAdd`: ficheros nuevos pendientes de subir (con preview local)
 *
 * Al guardar: DELETEs → POSTs nuevas → PATCH order final.
 */
export function ImagesEditor({ productRef, gallery: initialGallery }: ImagesEditorProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado local
  const [existing, setExisting] = useState<string[]>(initialGallery);
  const [toDelete, setToDelete] = useState<string[]>([]);
  const [toAdd, setToAdd] = useState<PendingFile[]>([]);
  const [order, setOrder] = useState<string[]>(initialGallery); // mezcla de urls existentes + ids pendientes ("pending:<id>")

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Drag-drop reordering
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Sync inicial cuando cambian las props (tras router.refresh)
  useEffect(() => {
    setExisting(initialGallery);
    setOrder(initialGallery);
    setToDelete([]);
    setToAdd((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  }, [initialGallery]);

  // beforeunload guard mientras haya cambios pendientes
  const hasChanges =
    toDelete.length > 0 ||
    toAdd.length > 0 ||
    JSON.stringify(order.filter((u) => !u.startsWith("pending:"))) !==
      JSON.stringify(initialGallery.filter((u) => !toDelete.includes(u)));

  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  function pendingPreview(id: string): string | null {
    const p = toAdd.find((x) => x.id === id);
    return p?.previewUrl ?? null;
  }

  function isPending(slot: string): boolean {
    return slot.startsWith("pending:");
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const newItems: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
        setError(`Formato no soportado: ${file.name}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`Imagen demasiado grande (>10 MB): ${file.name}`);
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      newItems.push({ id, file, previewUrl: URL.createObjectURL(file) });
    }
    setToAdd((prev) => [...prev, ...newItems]);
    setOrder((prev) => [...prev, ...newItems.map((n) => `pending:${n.id}`)]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeSlot(slot: string) {
    setOrder((prev) => prev.filter((s) => s !== slot));
    if (isPending(slot)) {
      const id = slot.slice("pending:".length);
      setToAdd((prev) => {
        const removed = prev.find((p) => p.id === id);
        if (removed) URL.revokeObjectURL(removed.previewUrl);
        return prev.filter((p) => p.id !== id);
      });
    } else {
      setToDelete((prev) => (prev.includes(slot) ? prev : [...prev, slot]));
    }
  }

  function restoreSlot(slot: string) {
    setToDelete((prev) => prev.filter((u) => u !== slot));
    setOrder((prev) => (prev.includes(slot) ? prev : [...prev, slot]));
  }

  function onDragStart(idx: number) {
    setDragIndex(idx);
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      setDragIndex(idx);
      return next;
    });
  }

  function onDragEnd() {
    setDragIndex(null);
  }

  function discardChanges() {
    setOrder(initialGallery);
    setExisting(initialGallery);
    setToDelete([]);
    setToAdd((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setError(null);
    setMessage(null);
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      // 1. DELETEs
      for (const url of toDelete) {
        await removeProductImage(productRef, url);
      }

      // 2. POSTs (mantener mapping pending-id → URL devuelta por el backend)
      const pendingToUrl = new Map<string, string>();
      for (const item of toAdd) {
        const fd = new FormData();
        fd.append("file", item.file);
        const result = await addProductImage(productRef, fd);
        // La nueva URL es la última del gallery devuelto (o ya estaba dedup → cogemos la que coincide en hash, fallback: última)
        const newUrl = result.gallery[result.gallery.length - 1] ?? "";
        pendingToUrl.set(item.id, newUrl);
      }

      // 3. PATCH order con la lista final de URLs reales
      const finalOrder = order
        .map((slot) => {
          if (isPending(slot)) {
            const id = slot.slice("pending:".length);
            return pendingToUrl.get(id) ?? "";
          }
          return slot;
        })
        .filter((u) => u.length > 0);

      // Dedup defensivo (puede haber colisiones por hash al subir la misma foto 2 veces)
      const seen = new Set<string>();
      const dedupedOrder = finalOrder.filter((u) => {
        if (seen.has(u)) return false;
        seen.add(u);
        return true;
      });

      if (dedupedOrder.length > 1) {
        // Sólo PATCH si hay >1 imagen, si no el reorder no aporta nada
        await reorderProductImages(productRef, dedupedOrder);
      }

      setMessage(`Galería guardada (${dedupedOrder.length} ${dedupedOrder.length === 1 ? "imagen" : "imágenes"})`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Slots a renderizar = order filtrado quitando los toDelete
  const visibleSlots = useMemo(
    () => order.filter((s) => isPending(s) || !toDelete.includes(s)),
    [order, toDelete],
  );

  // toDelete que el usuario puede restaurar
  const deletedRestorable = toDelete;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-display font-medium text-lg">Galería de imágenes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            La primera imagen es la principal. Arrastra para reordenar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={saving}
          className="inline-flex items-center gap-2 text-sm bg-secondary hover:bg-secondary/80 rounded-full px-4 py-2 transition-colors disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          Añadir imágenes
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
      {message && !error && (
        <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {visibleSlots.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="block w-full rounded-2xl border-2 border-dashed border-border py-12 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
        >
          Pulsa para subir imágenes (puedes seleccionar varias)
        </button>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleSlots.map((slot, idx) => {
            const isPend = isPending(slot);
            const src = isPend ? pendingPreview(slot.slice("pending:".length)) : slot;
            return (
              <li
                key={slot}
                draggable={!saving}
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                className={`relative aspect-square rounded-xl overflow-hidden bg-secondary border-2 ${
                  idx === 0 ? "border-accent" : "border-border"
                } group ${dragIndex === idx ? "opacity-50" : ""}`}
              >
                {src && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                {idx === 0 && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-accent text-accent-foreground rounded-full px-2 py-0.5">
                    <Star className="h-3 w-3 fill-current" /> Principal
                  </span>
                )}
                {isPend && (
                  <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider bg-amber-500/90 text-white rounded-full px-2 py-0.5">
                    Pendiente
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-white/80 cursor-grab" />
                  <button
                    type="button"
                    onClick={() => removeSlot(slot)}
                    disabled={saving}
                    className="text-white/90 hover:text-white p-1 rounded"
                    aria-label="Quitar imagen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deletedRestorable.length > 0 && (
        <div className="rounded-xl border border-dashed border-amber-400/50 bg-amber-50/50 p-3 space-y-2">
          <p className="text-xs uppercase tracking-wider text-amber-700">
            Marcadas para borrar ({deletedRestorable.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {deletedRestorable.map((url) => (
              <li key={url} className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 pl-1 pr-2 py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-8 w-8 rounded object-cover" />
                <button
                  type="button"
                  onClick={() => restoreSlot(url)}
                  disabled={saving}
                  className="text-xs text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Restaurar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando…" : "Guardar galería"}
        </button>
        {hasChanges && !saving && (
          <button
            type="button"
            onClick={discardChanges}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Descartar cambios
          </button>
        )}
        {hasChanges && !saving && (
          <span className="text-xs text-amber-600 ml-auto">
            ● Cambios sin guardar
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Formatos aceptados: JPEG, PNG, WebP, AVIF (≤ 10 MB cada una). Si subes una imagen
        idéntica a otra existente, se ignora automáticamente.
      </p>
    </div>
  );
}
