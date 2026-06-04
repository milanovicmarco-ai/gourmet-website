"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MessageCircle, Search, X, SlidersHorizontal } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import {
  products,
  ClientType,
  DishType,
  FoodCategory,
  Specialty,
  CLIENT_LABELS,
  DISH_LABELS,
  FOOD_LABELS,
  SPECIALTY_LABELS,
  HORECA_CLIENTS,
  RETAIL_CLIENTS,
} from "@/lib/products";
import { waLink } from "@/lib/contact";
import { cn } from "@/lib/utils";

const PRICE_MIN = 0;
const PRICE_MAX = 50;

const ALLERGEN_FILTERS = [
  { key: "gluten", label: "Sin gluten" },
  { key: "lactosa", label: "Sin lactosa" },
  { key: "vegan", label: "Vegano" },
] as const;

type AllergenKey = (typeof ALLERGEN_FILTERS)[number]["key"];

const FilterGroup = <T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { key: T; label: string }[];
  selected: T[];
  onToggle: (k: T) => void;
}) => (
  <div>
    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">{title}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onToggle(o.key)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-foreground",
            )}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
);

const Catalogo = () => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientType[]>([]);
  const [dishes, setDishes] = useState<DishType[]>([]);
  const [foods, setFoods] = useState<FoodCategory[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [allergens, setAllergens] = useState<AllergenKey[]>([]);
  const [priceMax, setPriceMax] = useState<number>(PRICE_MAX);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // ---- Preselección desde la URL (?cliente=horeca|retail, ?especialidad=...) ----
  useEffect(() => {
    const cliente = params.get("cliente");
    const esp = params.get("especialidad");
    if (cliente === "horeca") setClients(HORECA_CLIENTS);
    else if (cliente === "retail") setClients(RETAIL_CLIENTS);

    if (esp && esp !== "todas" && (esp in SPECIALTY_LABELS)) {
      setSpecialties([esp as Specialty]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, val: T) =>
    setter((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (clients.length && !clients.some((c) => p.clientTypes.includes(c))) return false;
      if (dishes.length && !dishes.some((d) => p.dishTypes.includes(d))) return false;
      if (foods.length && !foods.includes(p.foodCategory)) return false;
      if (specialties.length && !specialties.some((s) => p.specialties.includes(s))) return false;
      if (allergens.includes("gluten") && !p.glutenFree) return false;
      if (allergens.includes("lactosa") && !p.lactoseFree) return false;
      if (allergens.includes("vegan") && !p.vegan) return false;
      if (p.price > priceMax) return false;
      if (q) {
        const haystack = [p.name, p.brand, p.category, p.origin, p.flavor, p.description].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [query, clients, dishes, foods, specialties, allergens, priceMax]);

  const clear = () => {
    setQuery("");
    setClients([]);
    setDishes([]);
    setFoods([]);
    setSpecialties([]);
    setAllergens([]);
    setPriceMax(PRICE_MAX);
    router.replace(pathname);
  };

  const totalActive =
    clients.length + dishes.length + foods.length + specialties.length + allergens.length + (priceMax < PRICE_MAX ? 1 : 0);

  return (
    <Layout
      navTheme="light"
      seoTitle="Catálogo gourmet | Aurellano Productes Gastronòmics"
      seoDescription="Filtra +10.000 referencias gourmet por tipo de cliente, categoría, alérgeno o precio. Quesos, foie, conservas, despensa y línea Especial Sin."
    >
      {/* HERO */}
      <section className="container-edit pt-12 md:pt-20 pb-10 md:pb-14">
        <div className="max-w-4xl space-y-6">
          <p className="eyebrow">Catálogo</p>
          <h1 className="display text-balance">
            Encuentra el producto<br />
            <span className="italic font-light text-accent">como tú trabajas.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-pretty">
            Filtra por tipo de cliente, plato, categoría, especialidad o precio. Si no lo encuentras, lo conseguimos.
          </p>
        </div>
      </section>

      {/* BUSCADOR */}
      <section className="container-edit pb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto o marca…"
            className="w-full bg-secondary border border-border rounded-full pl-14 pr-12 py-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {/* FILTROS + RESULTADOS */}
      <section className="container-edit pb-24 md:pb-32">
        {/* Toggle filtros */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6 gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors",
              showFilters
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-foreground",
            )}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {totalActive > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold h-5 min-w-5 px-1.5">
                {totalActive}
              </span>
            )}
          </button>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "producto" : "productos"}
          </p>
        </div>

        {/* Panel filtros desplegable */}
        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-500",
            showFilters ? "max-h-[2000px] opacity-100 mb-10" : "max-h-0 opacity-0 mb-0",
          )}
        >
          <div className="rounded-3xl border border-border bg-secondary/40 p-6 md:p-8 grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            <FilterGroup
              title="Tipo de cliente"
              options={(Object.keys(CLIENT_LABELS) as ClientType[]).map((k) => ({ key: k, label: CLIENT_LABELS[k] }))}
              selected={clients}
              onToggle={(k) => toggle(setClients, k)}
            />
            <FilterGroup
              title="Tipo de producto"
              options={(Object.keys(DISH_LABELS) as DishType[]).map((k) => ({ key: k, label: DISH_LABELS[k] }))}
              selected={dishes}
              onToggle={(k) => toggle(setDishes, k)}
            />
            <FilterGroup
              title="Categoría alimentaria"
              options={(Object.keys(FOOD_LABELS) as FoodCategory[]).map((k) => ({ key: k, label: FOOD_LABELS[k] }))}
              selected={foods}
              onToggle={(k) => toggle(setFoods, k)}
            />
            <FilterGroup
              title="Especialidades"
              options={(Object.keys(SPECIALTY_LABELS) as Specialty[]).map((k) => ({ key: k, label: SPECIALTY_LABELS[k] }))}
              selected={specialties}
              onToggle={(k) => toggle(setSpecialties, k)}
            />
            <FilterGroup
              title="Alérgenos"
              options={ALLERGEN_FILTERS.map((a) => ({ key: a.key, label: a.label }))}
              selected={allergens}
              onToggle={(k) => toggle(setAllergens, k)}
            />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
                Precio · hasta {priceMax}€
              </p>
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={1}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{PRICE_MIN}€</span>
                <span>{PRICE_MAX}€+</span>
              </div>
            </div>
            {totalActive > 0 && (
              <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                <button onClick={clear} className="text-sm text-accent hover:underline">
                  Limpiar filtros ({totalActive})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* GRID */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {filtered.map((p) => (
              <ProductCard
                key={p.slug}
                image={p.image}
                title={p.name}
                category={p.category}
                origin={p.origin}
                href={`/producto/${p.slug}`}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border p-12 md:p-16 text-center space-y-5">
            <h3 className="font-display font-light text-3xl">No hay resultados</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Prueba ajustando los filtros o pídenos la referencia. Tenemos +200 proveedores y red de importación.
            </p>
            <a
              href={waLink("Hola Aurellano, busco una referencia concreta. ¿Podéis conseguirla?")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-5 pr-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              <MessageCircle className="h-4 w-4" /> Pedir referencia
            </a>
          </div>
        )}
      </section>

      <Link href="/contacto" className="sr-only">Contacto</Link>
    </Layout>
  );
};

export default Catalogo;
