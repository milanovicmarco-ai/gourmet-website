"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getLangFromPath, type Lang as RoutesLang } from "@/lib/i18n/routes";

export type Lang = RoutesLang;

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
  "Selecciones y dossieres en PDF de Aurellano y nuestras marcas distribuidas.":
    "Seleccions i dossiers en PDF d'Aurellano i les nostres marques distribuïdes.",
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
  "A tu lado": "Al teu costat",
  "Productos adaptados a": "Productes adaptats a",
  "tus necesidades": "les teves necessitats",
  "HORECA": "HORECA",
  "Producto pensado para hostelería: 4ª y 5ª gama, platos preparados, ingredientes de autor.":
    "Producte pensat per a l'hostaleria: 4a i 5a gamma, plats preparats, ingredients d'autor.",
  "Establecimientos": "Establiments",
  "Productos seleccionados para las tiendas.":
    "Productes seleccionats per a les botigues.",
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
  "Ideas para tu carta o tienda: combinaciones, novedades, propuestas para cada estación.":
    "Idees per a la teva carta o botiga: combinacions, novetats, propostes per a cada estació.",
  "Selección curada": "Selecció curada",
  "Nuestro catálogo": "El nostre catàleg",
  "Lo que nos": "El que ens",
  "apasiona": "apassiona",
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

  "Productos únicos": "Productes únics",
  "3 mundos, un mismo": "3 mons, un mateix",
  "criterio": "criteri",
  "Selecciones temáticas pensadas para diferenciarte.":
    "Seleccions temàtiques pensades per diferenciar-te.",
  "Iconos del gusto: foie, quesos afinados, anchoas, vermut. Lo que un paladar exigente reconoce al primer bocado.":
    "Icones del gust: foie, formatges afinats, anxoves, vermut. El que un paladar exigent reconeix a la primera mossegada.",
  "Vegano, sin gluten, sin lactosa, fermentados. Bienestar real con sabor de verdad.":
    "Vegà, sense gluten, sense lactosa, fermentats. Benestar real amb sabor de veritat.",
  "Producciones cortas, importaciones puntuales, ediciones numeradas. Lo que está hoy, mañana puede no estar.":
    "Produccions curtes, importacions puntuals, edicions numerades. El que hi ha avui, demà pot no ser-hi.",
  "Empecemos": "Comencem",
  "¿Hablamos de": "Parlem de",
  "tu carta": "la teva carta",
  "?": "?",
  "Cuéntanos qué necesitas. Te respondemos en breve con propuesta, precios y muestras si hace falta.":
    "Explica'ns què necessites. Et responem en breu amb proposta, preus i mostres si cal.",
  "Escribir por WhatsApp": "Escriure per WhatsApp",

  // Footer
  "Productos": "Productes",
  "Todos los productos": "Tots els productes",
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
  "Volver": "Tornar",

  // SobreNosotros (parcial — clave de cabecera)
  "Sobre nosotros": "Sobre nosaltres",
  "Nuestra historia": "La nostra història",

  // ── Foie ──
  "Tradición e innovación": "Tradició i innovació",
  "en todas sus formas.": "en totes les seves formes.",
  "Mi-cuit tradicional, mi-cuit con trufa, bloc, escalopa para plancha. Y nuestra apuesta inclusiva: foie vegano de anacardo, premium e indistinguible.": "Mi-cuit tradicional, mi-cuit amb tòfona, bloc, escalopa per a la planxa. I la nostra aposta inclusiva: foie vegà de caju, premium i indistingible.",
  "Hablar de foie": "Parlar de foie",
  "Tradicional + vegano.": "Tradicional + vegà.",
  "Selección": "Selecció",

  // ── Despensa (Rebost) ──
  "La despensa": "El rebost",
  "Despensa": "Rebost",
  "gourmet.": "gourmet.",
  "Conservas, aceites, vinagres, panes, pasta y dulces. La base de cualquier cocina con criterio.": "Conserves, olis, vinagres, pans, pasta i dolços. La base de qualsevol cuina amb criteri.",
  "Hablar con nosotros": "Parlar amb nosaltres",

  // ── Especial Sense ──
  "Inclusivo y delicioso": "Inclusiu i deliciós",
  "Especial": "Especial",
  "\"Sin\".": "\"Sense\".",
  "Sin gluten, sin lactosa, sin huevo, vegano. Para que tu carta no excluya a nadie y tu mesa healthy no renuncie al sabor.": "Sense gluten, sense lactosa, sense ou, vegà. Per tal que la teva carta no exclogui ningú i la teva taula healthy no renunciï al sabor.",
  "Sin gluten": "Sense gluten",
  "Sin lactosa": "Sense lactosa",
  "Sin huevo": "Sense ou",
  "Vegano": "Vegà",
  "Sin frutos secos": "Sense fruits secs",
  "Producto inclusivo, criterio gourmet.": "Producte inclusiu, criteri gourmet.",

  // ── Colmado (textos visibles) ──
  "Para tiendas y mercados": "Per a botigues i mercats",
  "SELECCIÓN DE VENTA AL DETALLE": "SELECCIÓ DE VENDA AL DETALL",
  "Gourmet.": "Gourmet.",
  "Producto gourmet pensado para tiendas, supermercados especializados, paradas de mercado y ultramarinos. Alta rotación, márgenes saneados y un surtido que diferencia tu lineal.": "Producte gourmet pensat per a botigues, supermercats especialitzats, parades de mercat i ultramarins. Alta rotació, marges sanejats i un assortit que diferencia el teu lineal.",
  "Producto pensado para tiendas, supermercados especializados, paradas de mercado y ultramarinos.": "Producte pensat per a botigues, supermercats especialitzats, parades de mercat i ultramarins.",
  "Ver catálogo para tu tienda": "Veure catàleg per a la teva botiga",
  "Beneficios para tu tienda": "Beneficis per a la teva botiga",
  "Margen, rotación y": "Marge, rotació i",
  "diferenciación": "diferenciació",
  ".": ".",
  "Surtido curado": "Assortit curat",
  "Selección que escapa del lineal genérico. Tu clientela viene a buscarte por lo que solo tienes tú.": "Selecció que escapa del lineal genèric. La teva clientela ve a buscar-te pel que només tens tu.",
  "Formato retail": "Format retail",
  "Etiquetado preparado para tienda, formatos que rotan y precio cerrado por unidad.": "Etiquetatge preparat per a botiga, formats que roten i preu tancat per unitat.",
  "Reposición ágil": "Reposició àgil",
  "Pedidos pequeños sin penalización. Repones cuando lo necesitas, no cuando toca.": "Comandes petites sense penalització. Reposes quan ho necessites, no quan toca.",
  "Tu coges": "Tu agafes",
  "Lo que está volando del lineal.": "El que vola del lineal.",
  "Top ventas.": "Top vendes.",
  "Ver todos los productos Colmado": "Veure tots els productes Colmado",
  "Primer precio": "Primer preu",

  // ── Sobre Nosaltres (cos) ──
  "+50 años seleccionando": "+50 anys seleccionant",
  "productos.": "productes.",
  "Empresa familiar de Lleida. Nacimos como pequeño distribuidor y nos hemos convertido en partner gourmet de referencia para profesionales del sector.": "Empresa familiar de Lleida. Vam néixer com a petit distribuïdor i ens hem convertit en partner gourmet de referència per a professionals del sector.",
  "De pequeño distribuidor": "De petit distribuïdor",
  "a partner": "a soci",
  "de referencia": "de referència",
  "Hoy": "Avui",
  "Empieza la historia": "Comença la història",
  "Fundación en Lleida como pequeño distribuidor de producto local.": "Fundació a Lleida com a petit distribuïdor de productes locals.",
  "El salto al gourmet": "El salt al sector gurmet",
  "Apuesta por producto de importación y denominaciones de origen.": "Aposta pel producte d'importació i per les denominacions d'origen.",
  "Profesionalización": "Professionalització",
  "Logística propia, almacén refrigerado y red de transporte.": "Logística pròpia, magatzem refrigerat i xarxa de transport.",
  "Empresa familiar profesionalizada, +200 proveedores y servicio en toda España y Andorra.": "Empresa familiar professionalitzada, amb més de 200 proveïdors i servei a tot Espanya i Andorra.",
  "Más de 10.000 referencias": "Més de 10.000 referències",
  "Cómo trabajamos": "Com treballem",
  "Cerca de cada": "A prop de cada",
  "cliente.": "client.",
  "Empresa familiar": "Empresa familiar",
  "Cercanía que se construye con el tiempo. Conocemos a nuestros clientes, sus necesidades y su manera de trabajar.": "Cercania que es construeix amb el temps. Coneixem els nostres clients, les seves necessitats i la seva manera de treballar.",
  "Profesionalizada": "Professionalitzada",
  "Una manera de trabajar cuidada con procesos claros, trazabilidad y una gestión ágil. Para ofrecerte un servicio cercano y eficiente.": "Una manera de treballar acurada amb processos clars, traçabilitat i una gestió àgil. Per oferir-te un servei proper i eficient.",
  "Visión gourmet": "Visió gourmet",
  "Buscamos constantemente nuevos productos para adaptarnos a las necesidades de cada cliente.": "Busquem constantment nous productes per adaptar-nos a les necessitats de cada client.",
  "Innovación": "Innovació",
  "Incorporamos nuevas ideas, productos y formatos para adaptarnos a las nuevas necesidades de cada cliente.": "Incorporem noves idees, productes i formats per adaptar-nos a les noves necessitats de cada client.",
  "¿Empezamos a": "Comencem a",
  "trabajar juntos": "treballar junts",
  "Cuéntanos qué necesitas para tu negocio. Te respondemos en breve con propuesta, precios y muestras si hace falta.": "Explica'ns què necessites per al teu negoci. Et responem en breu amb proposta, preus i mostres si cal.",

  // ── Contacte ──
  "Hablemos": "Parlem-ne",
  "Estamos al otro": "Som a l'altre",
  "lado del WhatsApp.": "costat del WhatsApp.",
  "El canal principal de Aurellano es WhatsApp. Te respondemos rápido, con propuesta y precios.": "El canal principal d'Aurellano és WhatsApp. Et responem ràpid, amb proposta i preus.",
  "Respondemos en breve en horario laboral. Cuéntanos qué buscas.": "Responem en breu en horari laboral. Explica'ns què busques.",
  "Teléfono": "Telèfon",
  "Email": "Email",
  "Dirección": "Adreça",
  "Horario": "Horari",
  "Lunes a Viernes": "De dilluns a divendres",
  "Zona de servicio": "Zona de servei",
  "España peninsular y Andorra.": "Espanya peninsular i Andorra.",
  "24–48h en Cataluña.": "24–48h a Catalunya.",
  "Pedido mínimo": "Comanda mínima",
  "Desde 200€ portes incluidos.": "Des de 200€ ports inclosos.",

  // ── Condicions de venda ──
  "Condiciones de venta": "Condicions de venda",
  "Claras desde": "Clares des de",
  "el primer pedido.": "la primera comanda.",
  "Entregas": "Lliuraments",
  "Resto de España y Andorra": "Resta d'Espanya i Andorra",
  "Pedido mínimo y portes": "Comanda mínima i ports",
  "portes incluidos según zona": "ports inclosos segons zona",
  "Zona 1": "Zona 1",
  "Catalunya": "Catalunya",
  "Zona 2": "Zona 2",
  "Norte y centro": "Nord i centre",
  "Zona 3": "Zona 3",
  "Sur": "Sud",
  "Pedidos inferiores": "Comandes inferiors",
  "gastos de envío.": "despeses d'enviament.",
  "Los pedidos se sirven en cajas completas.": "Les comandes es serveixen en caixes completes.",
  "Productos congelados": "Productes congelats",
  "según zona": "segons zona",
  "Formas de pago": "Formes de pagament",
  "Transferencia bancaria antes del envío.": "Transferència bancària abans de l'enviament.",
  "Pedidos": "Comandes",
  "Plazo": "Termini",
  "desde la recepción.": "des de la recepció.",
  "Solo por producto defectuoso.": "Només per producte defectuós.",
  "Devoluciones": "Devolucions",
  "¿Más información?": "Més informació?",
  "Estamos a tu disposición. Contáctanos por el canal que prefieras.": "Estem a la teva disposició. Contacta'ns pel canal que prefereixis.",

  // ── Consells ──
  "Saber gourmet": "Saber gourmet",
  "para profesionales": "per a professionals",
  "Maridajes, técnicas, conservación y trucos de oficio. Compartimos lo que aprendemos cada día con nuestros proveedores y clientes.": "Maridatges, tècniques, conservació i trucs d'ofici. Compartim el que aprenem cada dia amb els nostres proveïdors i clients.",
  "Tabla de quesos": "Taula de formatges",
  "Cómo montar una tabla de quesos memorable": "Com muntar una taula de formatges memorable",
  "Variedad de leches, intensidades y maridajes. Cantidades, orden de cata y acompañamientos imprescindibles.": "Varietat de llets, intensitats i maridatges. Quantitats, ordre de tast i acompanyaments imprescindibles.",
  "Foie y vinos dulces: el matrimonio perfecto": "Foie i vins dolços: el matrimoni perfecte",
  "De Sauternes a Pedro Ximénez. Por qué funcionan y cómo elegir según el tipo de foie.": "De Sauternes a Pedro Ximénez. Per què funcionen i com triar segons el tipus de foie.",
  "Conservación": "Conservació",
  "Conservar quesos curados sin perder cualidades": "Conservar formatges curats sense perdre qualitats",
  "Temperatura, humedad y atemperado. Errores frecuentes en cocinas profesionales.": "Temperatura, humitat i atemperat. Errors freqüents a cuines professionals.",
  "¿Tienes una duda concreta?": "Tens un dubte concret?",
  "Nuestro equipo lleva +50 años entre quesos, foies y despensas premium. Pregúntanos.": "El nostre equip porta +50 anys entre formatges, foies i rebosts premium. Pregunta'ns.",
  "Contactar": "Contactar",

  // ── 404 ──
  "Error 404": "Error 404",
  "Esta página": "Aquesta pàgina",
  "no la tenemos en cámara.": "no la tenim a la càmera.",
  "La URL que buscas no existe o ha cambiado de sitio. Pero seguro que hay algo que sí te interesa en nuestro catálogo. Échale un vistazo o escríbenos por WhatsApp y te orientamos.": "L'URL que busques no existeix o ha canviat de lloc. Segur que hi ha alguna cosa que sí t'interessa al nostre catàleg. Fes-hi un cop d'ull o escriu-nos per WhatsApp i t'orientem.",
  "Volver a la home": "Tornar a l'inici",
  "Mientras tanto": "Mentrestant",
  "Tablas de queso": "Taules de formatge",
  "que sí encontrarás.": "que sí trobaràs.",

  // ── Catàleg + filtres ──
  "Encuentra el producto": "Troba el producte",
  "como tú trabajas.": "com tu treballes.",
  "Filtra por tipo de cliente, plato, categoría, especialidad o precio. Si no lo encuentras, lo conseguimos.": "Filtra per tipus de client, plat, categoria, especialitat o preu. Si no el trobes, ho aconseguim.",
  "Buscar producto o marca…": "Cercar producte o marca…",
  "producto": "producte",
  "productos": "productes",
  "Tipo de cliente": "Tipus de client",
  "Tipo de producto": "Tipus de producte",
  "Categoría alimentaria": "Categoria alimentària",
  "Restaurantes": "Restaurants",
  "Cafeterías": "Cafeteries",
  "Bares": "Bars",
  "Tiendas gourmet": "Botigues gourmet",
  "Primeros platos": "Primers plats",
  "Segundos platos": "Segons plats",
  "Postres": "Postres",
  "Platos preparados": "Plats preparats",
  "Pasta": "Pasta",
  "Dulces": "Dolços",
  "Salado": "Salat",
  "Bebidas": "Begudes",
  "Secrets du Chef": "Secrets du Chef",
  "Edición limitada": "Edició limitada",
  "Healthy food": "Healthy food",
  "Precio · hasta": "Preu · fins a",
  "No hay resultados": "No hi ha resultats",
  "Prueba ajustando los filtros o pídenos la referencia. Tenemos +200 proveedores y red de importación.": "Prova ajustant els filtres o demana'ns la referència. Tenim +200 proveïdors i xarxa d'importació.",
  "Pedir referencia": "Demanar referència",

  // ── Quesos (repàs) ──
  "selección Aurellano": "selecció Aurellano",
  "Pedir más información": "Demanar més informació",
  // Quesos / Cheese lovers
  "afinart · selección Aurellano": "afinart · selecció Aurellano",
  "como deben ser.": "com han de ser.",
  "Trabajamos con maestros afinadores. Te ayudamos a montar la tabla, calcular cantidades y maridar.":
    "Treballem amb mestres afinadors. T'ajudem a muntar la taula, calcular quantitats i maridar.",
  "Pedir muestrario": "Demanar mostrari",
  "Por origen": "Per origen",
  "Por intensidad": "Per intensitat",
  "Por familia": "Per família",
  "Castilla": "Castella",
  "Asturias": "Astúries",
  "País Vasco": "País Basc",
  "Francia": "França",
  "Italia": "Itàlia",
  "Suiza": "Suïssa",
  "Holanda": "Holanda",
  "Suave": "Suau",
  "Medio": "Mitjà",
  "Intenso": "Intens",
  "Muy intenso": "Molt intens",
  "Pasta dura": "Pasta dura",
  "Hoy en cámara": "Avui a la cambra",
  "Algunos de nuestros": "Alguns dels nostres",
  "imprescindibles": "imprescindibles",
  "Lo que va": "El que va",
  "con cada queso.": "amb cada formatge.",
  "Combinaciones probadas en sala. Cuéntanos tu carta de vinos y te proponemos la tabla.":
    "Combinacions provades en sala. Explica'ns la teva carta de vins i et proposem la taula.",
  "Membrillo + tinto reserva": "Codonyat + negre reserva",
  "Mermelada de higo + cava": "Melmelada de figa + cava",
  "Miel + Pedro Ximénez": "Mel + Pedro Ximénez",
  "Pera + sidra natural": "Pera + sidra natural",
  "¿Montamos": "Muntem",
  "tu tabla": "la teva taula",
  "tu tabla de quesos": "la teva fusta de formatges",

  // ── Secrets du Xef (repàs) ──
  "Te asesoramos con cantidades, formatos y maridajes según tu carta. Selección curada por maestros afinadores.":
    "T'assessorem amb quantitats, formats i maridatges segons la teva carta. Selecció curada per mestres afinadors.",
  "Hablemos de quesos": "Parlem de formatges",

  // Colmado
  "surtido": "assortit",
  "para vender": "per vendre",

  // Secrets du Xef
  "Para hostelería": "Per a l'hostaleria",
  "Secrets": "Secrets",
  "du Xef.": "du Xef.",
  "Producto pensado para servicio. 4ª y 5ª gama, platos preparados de autor, ingredientes diferenciales que ahorran tiempo sin renunciar al criterio.":
    "Producte pensat per al servei. 4a i 5a gamma, plats preparats d'autor, ingredients diferencials que estalvien temps sense renunciar al criteri.",
  "Catálogo para tu negocio": "Catàleg per al teu negoci",
  "listo para": "llest per",
  "emplatar": "emplatar",
  "Beneficios para tu cocina": "Beneficis per a la teva cuina",
  "Tiempo, criterio y": "Temps, criteri i",
  "consistencia": "consistència",
  "Sin merma": "Sense minva",
  "Porcionado y formato pensado para servicio. Aprovecha el 100%.":
    "Porcionat i format pensat per al servei. Aprofita el 100%.",
  "Calidad uniforme": "Qualitat uniforme",
  "Misma receta plato a plato. Tu cliente repite porque sabe a lo de siempre.":
    "Mateixa recepta plat a plat. El teu client repeteix perquè té el gust de sempre.",
  "Tu carta, tu autoría": "La teva carta, la teva autoria",
  "Te damos la base. Tú añades la firma.":
    "Et donem la base. Tu hi afegeixes la firma.",
  "Lo que está saliendo de cocina.": "El que està sortint de cuina.",
  "Ver todos los productos HORECA": "Veure tots els productes HORECA",
  "Margen para tu negocio,": "Marge per al teu negoci,",
  "precio para tu carta": "preu per a la teva carta",
  "Productos de Primer Precio.": "Productes de Primer Preu.",
  "Una selección de productos económicos y de alta rotación para escalar márgenes.":
    "Una selecció de productes econòmics i d'alta rotació per escalar marges.",
  "Ver todos los primer precio HORECA": "Veure tots els primer preu HORECA",

  // Sobre Nosotros
  "1968": "1968",
  "1985": "1985",
  "2005": "2005",

  // Contacto
  "Instagram": "Instagram",

  // Foie
  "Foie": "Foie",

  // Despensa

  // EspecialSin

  // Consejos

  // ── Consentimiento de cookies ──
  "Uso de cookies": "Ús de cookies",
  "Usamos cookies propias y de terceros para analizar el tráfico de la web. Puedes aceptarlas, rechazarlas o personalizar tu elección en cualquier momento.":
    "Utilitzem cookies pròpies i de tercers per analitzar el trànsit de la web. Pots acceptar-les, rebutjar-les o personalitzar la teva elecció en qualsevol moment.",
  "Más información": "Més informació",
  "Rechazar todo": "Rebutjar-ho tot",
  "Personalizar": "Personalitzar",
  "Aceptar todo": "Acceptar-ho tot",
  "Preferencias de cookies": "Preferències de cookies",
  "Elige qué cookies aceptas": "Tria quines cookies acceptes",
  "Cookies necesarias": "Cookies necessàries",
  "Imprescindibles para que la web funcione (navegación, seguridad). No se pueden desactivar.":
    "Imprescindibles perquè la web funcioni (navegació, seguretat). No es poden desactivar.",
  "Cookies analíticas": "Cookies analítiques",
  "Nos permiten medir visitas y uso de la web (Google Analytics) para mejorarla.":
    "Ens permeten mesurar visites i ús de la web (Google Analytics) per millorar-la.",
  "Cookies de marketing": "Cookies de màrqueting",
  "Se usarían para medir campañas y mostrar contenido relevante en otras webs.":
    "S'utilitzarien per mesurar campanyes i mostrar contingut rellevant en altres webs.",
  "Consulta más detalle en nuestra": "Consulta més detall a la nostra",
  "Política de Cookies": "Política de Cookies",
  "Guardar preferencias": "Desar preferències",

  // ── Política de privacidad / cookies (páginas legales) ──
  "Política de Privacidad": "Política de Privacitat",
  "Cómo tratamos": "Com tractem",
  "tus datos.": "les teves dades.",
  "Responsable del tratamiento": "Responsable del tractament",
  "Finalidad del tratamiento": "Finalitat del tractament",
  "Legitimación": "Legitimació",
  "Destinatarios": "Destinataris",
  "Tus derechos": "Els teus drets",
  "Conservación de los datos": "Conservació de les dades",
  "Reclamaciones": "Reclamacions",
  "Gestionar mis preferencias de cookies": "Gestionar les meves preferències de cookies",
  "¿Qué son las cookies?": "Què són les cookies?",
  "Cookies que utilizamos": "Cookies que utilitzem",
  "Nombre": "Nom",
  "Finalidad": "Finalitat",
  "Duración": "Durada",
  "Proveedor": "Proveïdor",
  "Sesión / hasta 12 meses": "Sessió / fins a 12 mesos",
  "Guarda tu elección de cookies para no volver a preguntarte.": "Desa la teva elecció de cookies per no tornar-t'ho a preguntar.",
  "Propia": "Pròpia",
  "Hasta 13 meses": "Fins a 13 mesos",
  "Hasta 24 horas": "Fins a 24 hores",
  "Distingue usuarios de forma anónima para medir el uso de la web.": "Distingeix usuaris de forma anònima per mesurar l'ús de la web.",
  "Limita la frecuencia de las peticiones a Google Analytics.": "Limita la freqüència de les peticions a Google Analytics.",
  "Solo se instalan si aceptas la categoría \"Analítica\" en el panel de cookies.": "Només s'instal·len si acceptes la categoria \"Analítica\" al plafó de cookies.",
  "Hasta 12 meses": "Fins a 12 mesos",

  // Privacidad — cuerpo
  "Aurellano Productes Gastronòmics, con domicilio en Carrer de les Valls d'Andorra, 52, 25005 Lleida, email hola@aurellano.com y teléfono 973 248 266, es responsable del tratamiento de los datos que nos facilitas a través de este sitio web (formulario de contacto, WhatsApp o email).":
    "Aurellano Productes Gastronòmics, amb domicili al Carrer de les Valls d'Andorra, 52, 25005 Lleida, email hola@aurellano.com i telèfon 973 248 266, és responsable del tractament de les dades que ens facilites a través d'aquest lloc web (formulari de contacte, WhatsApp o email).",
  "Gestionar tus consultas comerciales, prepararte propuestas de producto y precios, y mantener la relación comercial una vez sois clientes. Si aceptas las cookies analíticas, también usamos datos de navegación agregados para mejorar la web (ver Política de Cookies).":
    "Gestionar les teves consultes comercials, preparar-te propostes de producte i preus, i mantenir la relació comercial un cop sigueu clients. Si acceptes les cookies analítiques, també utilitzem dades de navegació agregades per millorar la web (vegeu la Política de Cookies).",
  "El consentimiento que nos das al enviarnos tus datos (contacto) y, en su caso, la ejecución de la relación comercial una vez sois clientes.":
    "El consentiment que ens dones en enviar-nos les teves dades (contacte) i, si escau, l'execució de la relació comercial un cop sigueu clients.",
  "No cedemos tus datos a terceros salvo obligación legal. Usamos proveedores tecnológicos (hosting, email, Google Analytics si aceptas cookies analíticas) que actúan como encargados del tratamiento bajo contrato.":
    "No cedim les teves dades a tercers, tret d'obligació legal. Utilitzem proveïdors tecnològics (hosting, email, Google Analytics si acceptes cookies analítiques) que actuen com a encarregats del tractament sota contracte.",
  "Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiéndonos a hola@aurellano.com adjuntando copia de tu DNI o documento equivalente.":
    "Pots exercir els teus drets d'accés, rectificació, supressió, oposició, limitació i portabilitat escrivint-nos a hola@aurellano.com adjuntant còpia del teu DNI o document equivalent.",
  "Conservamos tus datos mientras dure la relación comercial y, tras finalizar, durante los plazos legalmente exigibles para atender posibles responsabilidades.":
    "Conservem les teves dades mentre duri la relació comercial i, un cop finalitzada, durant els terminis legalment exigibles per atendre possibles responsabilitats.",
  "Si consideras que no hemos tratado tus datos correctamente, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).":
    "Si consideres que no hem tractat les teves dades correctament, pots presentar una reclamació davant l'Agència Espanyola de Protecció de Dades (www.aepd.es).",

  // Cookies — cuerpo
  "Las cookies son pequeños archivos que se guardan en tu navegador cuando visitas una web. Nos ayudan a recordar tu elección de cookies y, si nos das permiso, a entender cómo se usa la web para mejorarla.":
    "Les cookies són petits arxius que es desen al teu navegador quan visites una web. Ens ajuden a recordar la teva elecció de cookies i, si ens ho permets, a entendre com s'utilitza la web per millorar-la.",
};

const dictionaries: Record<Lang, Dict> = { es: {}, ca };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nCtx | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  // El idioma SE DEDUCE del pathname (/es/... o /ca/...). Next re-renderiza
  // este componente en cada navegación, así que `lang` se mantiene en sync con
  // la URL automáticamente. Sin cookies, sin localStorage, sin reload.
  const pathname = usePathname() ?? "/";
  const lang: Lang = getLangFromPath(pathname);

  // Actualiza el atributo <html lang="…"> cuando cambia la URL, para a11y/SEO.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // setLang queda como no-op: el cambio de idioma ahora ocurre vía navegación
  // del LangSwitcher (router.push a la URL equivalente del otro idioma).
  const setLang = (_next: Lang) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[i18n] setLang() ya no cambia el idioma — usa el LangSwitcher que navega a la URL equivalente.",
      );
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
