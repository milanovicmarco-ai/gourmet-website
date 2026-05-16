"use client";

import { ReactNode, useState } from "react";
import type { ApiProduct } from "@/lib/pim/api";
import type { ProductTranslation } from "@/lib/pim/translations";
import { ProductEditForm } from "./edit-form";
import { TranslationsForm } from "./translations-form";
import type { FormFields } from "@/lib/pim/api-mapper";
import type { ProductMeta } from "@/lib/pim/product-meta";

interface Props {
  productRef: string;
  product: ApiProduct;
  esInitial: FormFields;
  caInitial: ProductTranslation | null;
  meta: ProductMeta;
  families?: { slug: string; display_name: string; active: boolean; count: number }[];
}

export function LocaleTabs({ productRef, product, esInitial, caInitial, meta, families }: Props) {
  const [active, setActive] = useState<"es" | "ca">("es");

  return (
    <div className="space-y-5">
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1">
        <Tab active={active === "es"} onClick={() => setActive("es")}>ESP</Tab>
        <Tab active={active === "ca"} onClick={() => setActive("ca")}>CAT</Tab>
      </div>

      {active === "es" ? (
        <ProductEditForm productRef={productRef} initial={esInitial} meta={meta} families={families} />
      ) : (
        <TranslationsForm
          productRef={productRef}
          locale="ca"
          initial={caInitial ?? {}}
          source={product}
        />
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center text-sm px-4 py-1.5 rounded-full transition-colors ${
        active
          ? "bg-background text-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
