import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "es" | "ca";

type Dict = Record<string, string>;

// Diccionario CAT. Las claves son las cadenas en español originales.
// Si una clave no existe aquí, se devuelve la clave (español por defecto).
const ca: Dict = {
  // Nav
  "Catálogo": "Catàleg",
  "Secrets du Xef": "Secrets du Xef",
  "Colmado": "Colmado",
  "Especialidades": "Especialitats",
  "Quesos": "Formatges",
  "Delicatessen": "Delicatessen",
  "Healthy Food": "Healthy Food",
  "Limited Edition": "Limited Edition",
  "Aurellano": "Aurellano",
  "Consejos": "Consells",
  "Contacto": "Contacte",
  "Abrir menú": "Obrir menú",
  "Hablar por WhatsApp": "Parlar per WhatsApp",
  "Principal": "Principal",
  "Móvil": "Mòbil",

  // Floating / Asistente
  "Asistente IA": "Assistent IA",
  "Asistente Gourmet": "Assistent Gourmet",
  "Cerrar": "Tancar",
  "Cerrar chat": "Tancar xat",
  "Abrir Asistente Gourmet": "Obrir Assistent Gourmet",
  "Cerrar Asistente Gourmet": "Tancar Assistent Gourmet",
  "Hablar por WhatsApp con Aurellano": "Parlar per WhatsApp amb Aurellano",
  "Sugerencias": "Suggeriments",
  "Pregúntame sobre quesos, foie…": "Pregunta'm sobre formatges, foie…",
  "Enviar": "Enviar",
  "¡Hola! Soy el **Asistente Gourmet de Aurellano** 👨‍🍳\n\nPregúntame sobre quesos, foie, maridajes, productos sin gluten o lo que necesites para tu negocio.":
    "Hola! Soc l'**Assistent Gourmet d'Aurellano** 👨‍🍳\n\nPregunta'm sobre formatges, foie, maridatges, productes sense gluten o el que necessitis per al teu negoci.",
  "¿Qué quesos recomendarías para una tabla equilibrada?":
    "Quins formatges recomanaries per a una taula equilibrada?",
  "Busco un foie para un menú de Navidad": "Busco un foie per a un menú de Nadal",
  "Productos sin gluten para una cafetería": "Productes sense gluten per a una cafeteria",
  "No pude responder ahora mismo. Prueba en un momento o escríbenos por WhatsApp.":
    "No he pogut respondre ara mateix. Prova d'aquí a un moment o escriu-nos per WhatsApp.",
  "Demasiadas consultas seguidas. Espera unos segundos e inténtalo de nuevo.":
    "Massa consultes seguides. Espera uns segons i torna-ho a provar.",
  "El asistente está temporalmente fuera de servicio. Escríbenos por WhatsApp.":
    "L'assistent està temporalment fora de servei. Escriu-nos per WhatsApp.",
  "Algo ha fallado. Inténtalo de nuevo o escríbenos por WhatsApp.":
    "Alguna cosa ha fallat. Torna-ho a provar o escriu-nos per WhatsApp.",

  // Home
  "Desde 1968 · Lleida": "Des de 1968 · Lleida",
  "Tu partner": "El teu partner",
  "gastronómico": "gastronòmic",
  "Distribuidora para restauración y comercio especializado con +10.000 referencias y +200 proveedores. Ofrecemos el mayor surtido, calidad y fiabilidad.":
    "Distribuïdora per a restauració i comerç especialitzat amb +10.000 referències i +200 proveïdors. Oferim el major assortit, qualitat i fiabilitat.",
  "Pedidos por WhatsApp": "Comandes per WhatsApp",
  "Ver catálogo": "Veure catàleg",
  "años de experiencia": "anys d'experiència",
  "proveedores": "proveïdors",
  "referencias": "referències",
  "tradición familiar": "tradició familiar",
  "Para quién trabajamos": "Per a qui treballem",
  "Lo que te piden": "El que et demanen",
  "tus clientes": "els teus clients",
  "Seleccionamos producto y servicio según lo que necesita cada negocio.":
    "Seleccionem producte i servei segons el que necessita cada negoci.",
  "HORECA": "HORECA",
  "Producto pensado para hostelería: 4ª y 5ª gama, platos preparados, ingredientes de autor.":
    "Producte pensat per a l'hostaleria: 4a i 5a gamma, plats preparats, ingredients d'autor.",
  "Establecimientos": "Establiments",
  "Producto premium de alta rotación y cero desperdicio. Lo que tu cliente busca y aún no sabe.":
    "Producte premium d'alta rotació i zero malbaratament. El que el teu client busca i encara no sap.",
  "Qué ofrecemos": "Què oferim",
  "Más que un proveedor.": "Més que un proveïdor.",
  "Tu": "El teu",
  "partner.": "partner.",
  "Distribución": "Distribució",
  "Logística propia. Entregas en 24–48h en Cataluña y 48–72h en el resto de España y Andorra.":
    "Logística pròpia. Lliuraments en 24–48h a Catalunya i 48–72h a la resta d'Espanya i Andorra.",
  "Asesoramiento": "Assessorament",
  "Conocemos producto, mercado y temporada. Te ayudamos a elegir, ahorrar y diferenciarte.":
    "Coneixem producte, mercat i temporada. T'ajudem a triar, estalviar i diferenciar-te.",
  "Inspiración": "Inspiració",
  "Ideas para tu carta o tienda: combinaciones, novedades, propuestas para cada estación.":
    "Idees per a la teva carta o botiga: combinacions, novetats, propostes per a cada estació.",
  "Selección curada": "Selecció curada",
  "Lo que hoy nos tiene": "El que avui ens té",
  "obsesionados": "obsessionats",
  "Ver todo el catálogo": "Veure tot el catàleg",
  "Especialidad de la casa": "Especialitat de la casa",
  "Quesos afinados": "Formatges afinats",
  "con criterio.": "amb criteri.",
  "Trabajamos directo con maestros afinadores. Por origen, intensidad y maduración. Te ayudamos a montar la tabla perfecta — y a maridarla.":
    "Treballem directament amb mestres afinadors. Per origen, intensitat i maduració. T'ajudem a muntar la taula perfecta — i a maridar-la.",
  "Cabra": "Cabra",
  "Oveja": "Ovella",
  "Vaca": "Vaca",
  "Mezclas": "Mescles",
  "Azules": "Blaus",
  "Pasta blanda": "Pasta tova",
  "Curados": "Curats",
  "Veganos": "Vegans",
  "Explorar quesos": "Explorar formatges",
  "Especialidades Gourmet": "Especialitats Gourmet",
  "Tres mundos, un mismo": "Tres mons, un mateix",
  "criterio": "criteri",
  "Selecciones temáticas pensadas para diferenciarte. Cada una con su catálogo dedicado.":
    "Seleccions temàtiques pensades per diferenciar-te. Cadascuna amb el seu catàleg dedicat.",
  "Productos que enamoran": "Productes que enamoren",
  "Iconos del gusto: foie, quesos afinados, anchoas, vermut. Lo que un paladar exigente reconoce al primer bocado.":
    "Icones del gust: foie, formatges afinats, anxoves, vermut. El que un paladar exigent reconeix a la primera mossegada.",
  "Sano sin renunciar": "Sa sense renunciar",
  "Vegano, sin gluten, sin lactosa, fermentados, miel cruda. Bienestar real con sabor de verdad.":
    "Vegà, sense gluten, sense lactosa, fermentats, mel crua. Benestar real amb sabor de veritat.",
  "Series limitadas": "Sèries limitades",
  "Producciones cortas, importaciones puntuales, ediciones numeradas. Lo que está hoy, mañana puede no estar.":
    "Produccions curtes, importacions puntuals, edicions numerades. El que hi ha avui, demà pot no ser-hi.",
  "\"Llevamos 12 años trabajando con Aurellano. Nunca hemos tenido un imprevisto que no resolvieran en horas. Es como tener un sumiller del producto en plantilla.\"":
    "\"Fa 12 anys que treballem amb Aurellano. Mai hem tingut un imprevist que no resolguessin en hores. És com tenir un sommelier del producte a plantilla.\"",
  "Chef · Restaurante 1 Estrella Michelin · Cataluña":
    "Xef · Restaurant 1 Estrella Michelin · Catalunya",
  "Novedad": "Novetat",
  "Tostadas personalizadas para tu carta": "Torrades personalitzades per a la teva carta",
  "Diseñamos contigo formato, harina y horneado. Pedido mínimo desde 200 unidades.":
    "Dissenyem amb tu format, farina i cocció. Comanda mínima des de 200 unitats.",
  "Pídelas": "Demana-les",
  "Empecemos": "Comencem",
  "¿Hablamos de": "Parlem de",
  "tu carta": "la teva carta",
  "?": "?",
  "Cuéntanos qué necesitas. Te respondemos en horas con propuesta, precios y muestras si hace falta.":
    "Explica'ns què necessites. Et responem en hores amb proposta, preus i mostres si cal.",
  "Escribir por WhatsApp": "Escriure per WhatsApp",

  // Footer
  "Productos": "Productes",
  "Todos los productos": "Tots els productes",
  "Catálogos": "Catàlegs",
  "Gourmet": "Gourmet",
  "Historia": "Història",
  "Misión y visión": "Missió i visió",
  "Distribuimos producto gourmet con criterio propio para restaurantes, hoteles y tiendas que buscan algo más.":
    "Distribuïm producte gourmet amb criteri propi per a restaurants, hotels i botigues que busquen alguna cosa més.",
  "Privacidad": "Privacitat",
  "Condiciones": "Condicions",
  "Cookies": "Galetes",

  // Catalog / filtros (genérico)
  "Filtros": "Filtres",
  "Filtrar": "Filtrar",
  "Buscar": "Cercar",
  "Categoría": "Categoria",
  "Todos": "Tots",
  "Limpiar filtros": "Netejar filtres",
  "Ver producto": "Veure producte",
  "Origen": "Origen",
  "Volver": "Tornar",

  // SobreNosotros (parcial — clave de cabecera)
  "Sobre nosotros": "Sobre nosaltres",
  "Nuestra historia": "La nostra història",
};

const dictionaries: Record<Lang, Dict> = { es: {}, ca };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nCtx | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "es";
    const saved = window.localStorage.getItem("aurellano.lang");
    return saved === "ca" ? "ca" : "es";
  });

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
    if (typeof window !== "undefined") window.localStorage.setItem("aurellano.lang", lang);
  }, [lang]);

  const t = (key: string): string => {
    const dict = dictionaries[lang];
    return dict[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangState, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nCtx => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};

export const useT = () => useI18n().t;
