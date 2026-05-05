"use client";

import { useEffect } from "react";

/**
 * Sets <title> and <meta name="description"> for the current page.
 * Interim solution for SPA. Will be replaced by Next.js generateMetadata
 * once the migration is done.
 *
 * Title pattern: "{Página} | Aurellano Productos Gastronómicos" (≤ 60 chars).
 */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let descMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    let previousDesc: string | null = null;

    if (description) {
      if (!descMeta) {
        descMeta = document.createElement("meta");
        descMeta.name = "description";
        document.head.appendChild(descMeta);
      }
      previousDesc = descMeta.content;
      descMeta.content = description;
    }

    // OG and Twitter tags share copy with the page meta.
    const sync = (selector: string, value: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.content = value;
    };
    sync('meta[property="og:title"]', title);
    sync('meta[name="twitter:title"]', title);
    if (description) {
      sync('meta[property="og:description"]', description);
      sync('meta[name="twitter:description"]', description);
    }

    return () => {
      document.title = previousTitle;
      if (description && descMeta && previousDesc !== null) {
        descMeta.content = previousDesc;
      }
    };
  }, [title, description]);
}
