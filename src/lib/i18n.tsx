"use client";

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
  "Cheese lovers": "Cheese lovers",
  "Inspírate": "Inspira't",
  "Designed by": "Dissenyat per",
  "Healthy Food": "Healthy Food",
  "Limited Edition": "Limited Edition",
  "Aurellano": "Aurellano",
  "Sobre Nosotros": "Sobre Nosaltres",

  // Ficha de producto
  "Inicio": "Inici",
  "Sin imagen": "Sense imatge",
  "Ref.": "Ref.",
  "Marca": "Marca",
  "Origen": "Origen",
  "Formato unitario": "Format unitari",
  "Unidades por caja": "Unitats per caixa",
  "u/caja": "u/caixa",
  "Sabor": "Sabor",
  "Alérgenos": "Al·lèrgens",
  "Sin alérgenos declarados": "Sense al·lèrgens declarats",
  "Pedir información": "Demanar informació",
  // CTA final ficha de producto
  "+10.000 referencias": "+10.000 referències",
  "¿Buscas más información o un producto concreto?": "Busques més informació o un producte concret?",
  "Tenemos más de 10.000 referencias en catálogo y trabajamos con +200 proveedores. Si tienes dudas, buscas un producto específico o quieres realizar un pedido, habla con nuestro equipo comercial.":
    "Tenim més de 10.000 referències al catàleg i treballem amb +200 proveïdors. Si tens dubtes, busques un producte específic o vols fer una comanda, parla amb el nostre equip comercial.",
  "Hola Aurellano, querría hablar con comercial sobre": "Hola Aurellano, voldria parlar amb comercial sobre",
  "Hablar con comercial": "Parlar amb comercial",
  "Hola Aurellano, me interesa": "Hola Aurellano, m'interessa",
  "Sobre el producto": "Sobre el producte",
  "El detalle": "El detall",
  "Maridajes": "Maridatges",
  "Ingredientes": "Ingredients",
  "Información nutricional": "Informació nutricional",
  "Pedido mínimo 200€": "Comanda mínima 200€",
  "Portes incluidos según zona. Entrega en 24–48h en Cataluña.": "Ports inclosos segons zona. Lliurament en 24-48h a Catalunya.",
  "Ver condiciones de venta": "Veure condicions de venda",
  "Consejos": "Consells",
  // Inspiración (página /inspiracion)
  "Inspiración": "Inspiració",
  "Catálogos": "Catàlegs",
  "y colecciones.": "i col·leccions.",
  "Selecciones y dossieres en PDF de Aurellano y nuestras marcas distribuidas. Descárgalos y enséñalos a tu equipo o clientela.":
    "Seleccions i dossiers en PDF d'Aurellano i les nostres marques distribuïdes. Descarrega'ls i mostra'ls al teu equip o clientela.",
  "Próximamente": "Pròximament",
  "Estamos preparando las nuevas selecciones. Vuelve pronto o pídenos un catálogo concreto por WhatsApp.":
    "Estem preparant les noves seleccions. Torna aviat o demana'ns un catàleg concret per WhatsApp.",
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

  // Home — claim corporativo (fuente: src/lib/brand.ts).
  // El naming "Aurellano Productes Gastronòmics" es invariante: se renderiza
  // como literal en ambos idiomas, así que no necesita entrada de traducción.
  "Tu partner gastronómico": "El teu partner gastronòmic",
  "de confianza": "de confiança",
  "Especialistas en distribución de productos gourmet para restaurantes, hoteles y tiendas especializadas.":
    "Especialistes en distribució de productes gourmet per restaurants, hotels i botigues especialitzades.",
  // Strings antiguos del hero — los mantenemos por compatibilidad con otros sitios
  // (footer, lib/products, etc.) que aún puedan usarlos hasta limpiarse del todo.
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

  // Zonas de servicio (home)
  "Donde servimos": "On servim",
  "Cataluña": "Catalunya",
  "y Andorra": "i Andorra",
  "Logística propia con entrega 24-48h en Cataluña y 48-72h en Andorra. Cobertura completa para HORECA y comercio especializado.":
    "Logística pròpia amb lliurament en 24-48h a Catalunya i 48-72h a Andorra. Cobertura completa per a HORECA i comerç especialitzat.",
  "Barcelona": "Barcelona",
  "Girona": "Girona",
  "Lleida": "Lleida",
  "Tarragona": "Tarragona",
  "Andorra": "Andorra",
  "Restauración y comercio gourmet": "Restauració i comerç gourmet",
  "Costa Brava y Empordà": "Costa Brava i Empordà",
  "Sede central y logística": "Seu central i logística",
  "HORECA y comercio": "HORECA i comerç",
  "Servicio al Principat": "Servei al Principat",

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
  // IMPORTANTE: arrancamos siempre con "es" para evitar hydration mismatch.
  const [lang, setLangState] = useState<Lang>("es");

  // Lectura inicial post-mount (sólo cliente)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cookieMatch = document.cookie.match(/(?:^|; )aurellano_lang=(es|ca)/);
    if (cookieMatch) {
      const v = cookieMatch[1] as Lang;
      if (v !== lang) setLangState(v);
      return;
    }
    const saved = window.localStorage.getItem("aurellano.lang");
    if (saved === "ca" && lang !== "ca") setLangState("ca");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistencia + refresh del servidor cuando cambia el idioma
  const setLang = (next: Lang) => {
    // Escribimos cookie SINCRÓNICAMENTE antes de refrescar para que el server la lea bien
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
      document.cookie = `aurellano_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aurellano.lang", next);
    }
    setLangState(next);
    // Refrescamos el árbol de Server Components con el nuevo cookie set
    // (Next.js detecta el cookie y vuelve a renderizar páginas dinámicas)
    if (typeof window !== "undefined") {
      // Pequeño microtask para que la cookie esté realmente set antes del fetch
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 30);
    }
  };

  const t = (key: string): string => {
    const dict = dictionaries[lang];
    return dict[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
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
