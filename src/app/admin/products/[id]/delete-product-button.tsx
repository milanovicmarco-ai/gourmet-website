"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteProduct } from "../actions";

interface DeleteProductButtonProps {
  productRef: string;
  productName: string;
}

export function DeleteProductButton({ productRef, productName }: DeleteProductButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Doble confirmación: el usuario tiene que escribir la ref para activar el botón
  // de borrar. Lo de tipear la ref es el "are you sure" estándar de los PIMs serios.
  const [confirmText, setConfirmText] = useState("");

  function onClickDelete() {
    if (confirmText.trim() !== productRef) {
      setError(`Escribe exactamente la ref "${productRef}" para confirmar.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteProduct(productRef);
        // Tras borrar, vuelve al listado. El revalidatePath en la action ya refresca la cache.
        router.push("/admin/products");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar producto
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-4 max-w-xl">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-medium text-destructive">¿Eliminar este producto?</h3>
          <p className="text-sm text-foreground/80">
            Vas a borrar <span className="font-medium">{productName}</span> (ref{" "}
            <code className="text-xs">{productRef}</code>) del catálogo de Aurellano.
            La acción aplica el borrado lógico de la API y desaparecerá del listado
            público y del PIM.
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Para confirmar, escribe la ref:
        </span>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError(null);
          }}
          placeholder={productRef}
          autoFocus
          disabled={pending}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-destructive/40 focus:border-destructive font-mono text-sm"
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClickDelete}
          disabled={pending || confirmText.trim() !== productRef}
          className="bg-destructive text-destructive-foreground rounded-full px-5 py-2.5 text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Eliminando…" : "Sí, eliminar definitivamente"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmText("");
            setError(null);
          }}
          disabled={pending}
          className="rounded-full px-5 py-2.5 text-sm font-medium border border-border hover:border-foreground transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
