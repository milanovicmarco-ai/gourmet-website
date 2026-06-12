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

<<<<<<< HEAD
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
  "Gourmet.": "Gourmet.",
  "Producto gourmet pensado para tiendas, supermercados especializados, paradas de mercado y ultramarinos. Alta rotación, márgenes saneados y un surtido que diferencia tu lineal.": "Producte gourmet pensat per a botigues, supermercats especialitzats, parades de mercat i ultramarins. Alta rotació, marges sanejats i un assortit que diferencia el teu lineal.",
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
  "Selección retail": "Selecció retail",
  "Lo que está volando del lineal.": "El que vola del lineal.",
  "Ver todos los productos Colmado": "Veure tots els productes Colmado",
  "Primer precio": "Primer preu",
  "Económicos para tu lineal,": "Econòmics per al teu lineal,",
  "margen para tu tienda": "marge per a la teva botiga",
  "Productos de alta rotación con precio entry-level y buen margen para escalar volumen.": "Productes d'alta rotació amb preu entry-level i bon marge per escalar volum.",
  "Ver todos los primer precio Retail": "Veure tots els primer preu Retail",

  // ── Sobre Nosaltres (cos) ──
  "+50 años seleccionando": "+50 anys seleccionant",
  "producto con criterio.": "producte amb criteri.",
  "Empresa familiar de Lleida. Nacimos como pequeño distribuidor y nos hemos convertido en partner gourmet de referencia para profesionales en toda España y Andorra.": "Empresa familiar de Lleida. Vam néixer com a petit distribuïdor i ens hem convertit en partner gourmet de referència per a professionals a tota Espanya i Andorra.",
  "De pequeño distribuidor": "De petit distribuïdor",
  "a partner": "a partner",
  "de referencia": "de referència",
  "Hoy": "Avui",
  "Empieza la historia": "Comença la història",
  "Fundación en Lleida como pequeño distribuidor de producto local.": "Fundació a Lleida com a petit distribuïdor de producte local.",
  "El salto al gourmet": "El salt al gourmet",
  "Apuesta por producto de importación y denominaciones de origen.": "Aposta per producte d'importació i denominacions d'origen.",
  "Profesionalización": "Professionalització",
  "Logística propia, almacén refrigerado y red de transporte.": "Logística pròpia, magatzem refrigerat i xarxa de transport.",
  "Empresa familiar profesionalizada, +200 proveedores y servicio en toda España y Andorra.": "Empresa familiar professionalitzada, +200 proveïdors i servei a tota Espanya i Andorra.",
  "Cómo trabajamos": "Com treballem",
  "Cerca de cada": "A prop de cada",
  "cliente.": "client.",
  "Empresa familiar": "Empresa familiar",
  "Tres generaciones. Conocemos por su nombre a los clientes que llevan décadas con nosotros.": "Tres generacions. Coneixem pel seu nom els clients que fa dècades que estan amb nosaltres.",
  "Profesionalizada": "Professionalitzada",
  "Procesos, trazabilidad y logística propia. Te servimos como una multinacional, te tratamos como vecinos.": "Processos, traçabilitat i logística pròpia. Et servim com una multinacional, et tractem com a veïns.",
  "Visión gourmet": "Visió gourmet",
  "Buscamos lo que aún no se conoce. Visitamos productores. Probamos antes que nadie.": "Busquem el que encara no es coneix. Visitem productors. Provem abans que ningú.",
  "Innovación": "Innovació",
  "Apostamos por producto inclusivo, sin alérgenos y formatos pensados para tu negocio.": "Apostem per producte inclusiu, sense al·lèrgens i formats pensats per al teu negoci.",
  "¿Empezamos a": "Comencem a",
  "trabajar juntos": "treballar junts",
  "Cuéntanos qué necesitas para tu negocio. Te respondemos en horas con propuesta, precios y muestras si hace falta.": "Explica'ns què necessites per al teu negoci. Et responem en hores amb proposta, preus i mostres si cal.",

  // ── Contacte ──
  "Hablemos": "Parlem-ne",
  "Estamos al otro": "Som a l'altre",
  "lado del WhatsApp.": "costat del WhatsApp.",
  "El canal principal de Aurellano es WhatsApp. Te respondemos rápido, con propuesta y precios.": "El canal principal d'Aurellano és WhatsApp. Et responem ràpid, amb proposta i preus.",
  "Respondemos en horas en horario laboral. Cuéntanos qué buscas.": "Responem en hores en horari laboral. Explica'ns què busques.",
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
  "Pedidos en cajas completas.": "Comandes en caixes completes.",

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
  "como deben ser.": "com han de ser.",
  "Trabajamos con maestros afinadores. Te ayudamos a montar la tabla, calcular cantidades y maridar.": "Treballem amb mestres afinadors. T'ajudem a muntar la taula, calcular quantitats i maridar.",
  "Pedir más información": "Demanar més informació",
=======
  // Quesos / Cheese lovers
  "afinart · selección Aurellano": "afinart · selecció Aurellano",
  "como deben ser.": "com han de ser.",
  "Trabajamos con maestros afinadores. Te ayudamos a montar la tabla, calcular cantidades y maridar.":
    "Treballem amb mestres afinadors. T'ajudem a muntar la taula, calcular quantitats i maridar.",
  "Pedir muestrario": "Demanar mostrari",
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
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
<<<<<<< HEAD
=======
  "Vegano": "Vegà",
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
  "Hoy en cámara": "Avui a la cambra",
  "Algunos de nuestros": "Alguns dels nostres",
  "imprescindibles": "imprescindibles",
  "Lo que va": "El que va",
  "con cada queso.": "amb cada formatge.",
<<<<<<< HEAD
  "Combinaciones probadas en sala. Cuéntanos tu carta de vinos y te proponemos la tabla.": "Combinacions provades a sala. Explica'ns la teva carta de vins i et proposem la taula.",
  "Membrillo + tinto reserva": "Codony + negre reserva",
=======
  "Combinaciones probadas en sala. Cuéntanos tu carta de vinos y te proponemos la tabla.":
    "Combinacions provades en sala. Explica'ns la teva carta de vins i et proposem la taula.",
  "Membrillo + tinto reserva": "Codonyat + negre reserva",
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
  "Mermelada de higo + cava": "Melmelada de figa + cava",
  "Miel + Pedro Ximénez": "Mel + Pedro Ximénez",
  "Pera + sidra natural": "Pera + sidra natural",
  "¿Montamos": "Muntem",
  "tu tabla": "la teva taula",
<<<<<<< HEAD
  "Te asesoramos con cantidades, formatos y maridajes según tu carta. Selección curada por maestros afinadores.": "T'assessorem amb quantitats, formats i maridatges segons la teva carta. Selecció curada per mestres afinadors.",
  "Hablemos de quesos": "Parlem de formatges",

  // ── Secrets du Xef (repàs) ──
  "Para hostelería": "Per a l'hostaleria",
  "Producto pensado para servicio. 4ª y 5ª gama, platos preparados de autor, ingredientes diferenciales que ahorran tiempo sin renunciar al criterio.": "Producte pensat per a servei. 4a i 5a gamma, plats preparats d'autor, ingredients diferencials que estalvien temps sense renunciar al criteri.",
  "Catálogo para tu negocio": "Catàleg per al teu negoci",
  "listo para": "a punt per",
=======
  "Te asesoramos con cantidades, formatos y maridajes según tu carta. Selección curada por maestros afinadores.":
    "T'assessorem amb quantitats, formats i maridatges segons la teva carta. Selecció curada per mestres afinadors.",
  "Hablemos de quesos": "Parlem de formatges",

  // Colmado
  "Para tiendas y mercados": "Per a botigues i mercats",
  "Colmado": "Colmado",
  "Gourmet.": "Gourmet.",
  "Producto gourmet pensado para tiendas, supermercados especializados, paradas de mercado y ultramarinos. Alta rotación, márgenes saneados y un surtido que diferencia tu lineal.":
    "Producte gourmet pensat per a botigues, supermercats especialitzats, parades de mercat i ultramarins. Alta rotació, marges sanejats i un assortit que diferencia el teu lineal.",
  "Ver catálogo para tu tienda": "Veure catàleg per a la teva botiga",
  "surtido": "assortit",
  "para vender": "per vendre",
  "Beneficios para tu tienda": "Beneficis per a la teva botiga",
  "Margen, rotación y": "Marge, rotació i",
  "diferenciación": "diferenciació",
  "Surtido curado": "Assortit curat",
  "Selección que escapa del lineal genérico. Tu clientela viene a buscarte por lo que solo tienes tú.":
    "Selecció que s'escapa del lineal genèric. La teva clientela ve a buscar-te pel que només tens tu.",
  "Formato retail": "Format retail",
  "Etiquetado preparado para tienda, formatos que rotan y precio cerrado por unidad.":
    "Etiquetatge preparat per a botiga, formats que roten i preu tancat per unitat.",
  "Reposición ágil": "Reposició àgil",
  "Pedidos pequeños sin penalización. Repones cuando lo necesitas, no cuando toca.":
    "Comandes petites sense penalització. Reposes quan ho necessites, no quan toca.",
  "Selección retail": "Selecció retail",
  "Lo que está volando del lineal.": "El que està volant del lineal.",
  "Ver todos los productos Colmado": "Veure tots els productes Colmado",
  "Primer precio": "Primer preu",
  "Económicos para tu lineal,": "Econòmics per al teu lineal,",
  "margen para tu tienda": "marge per a la teva botiga",
  "Productos de alta rotación con precio entry-level y buen margen para escalar volumen.":
    "Productes d'alta rotació amb preu entry-level i bon marge per escalar volum.",
  "Ver todos los primer precio Retail": "Veure tots els primer preu Retail",

  // Secrets du Xef
  "Para hostelería": "Per a l'hostaleria",
  "Secrets": "Secrets",
  "du Xef.": "du Xef.",
  "Producto pensado para servicio. 4ª y 5ª gama, platos preparados de autor, ingredientes diferenciales que ahorran tiempo sin renunciar al criterio.":
    "Producte pensat per al servei. 4a i 5a gamma, plats preparats d'autor, ingredients diferencials que estalvien temps sense renunciar al criteri.",
  "Catálogo para tu negocio": "Catàleg per al teu negoci",
  "listo para": "llest per",
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
  "emplatar": "emplatar",
  "Beneficios para tu cocina": "Beneficis per a la teva cuina",
  "Tiempo, criterio y": "Temps, criteri i",
  "consistencia": "consistència",
<<<<<<< HEAD
  "Sin merma": "Sense pèrdua",
  "Porcionado y formato pensado para servicio. Aprovecha el 100%.": "Porcionat i format pensat per a servei. Aprofita el 100%.",
  "Calidad uniforme": "Qualitat uniforme",
  "Misma receta plato a plato. Tu cliente repite porque sabe a lo de siempre.": "Mateixa recepta plat a plat. El teu client repeteix perquè sap com sempre.",
  "Tu carta, tu autoría": "La teva carta, la teva autoria",
  "Te damos la base. Tú añades la firma. Nadie sabrá que no es 100% de la casa.": "Et donem la base. Tu hi afegeixes la firma. Ningú sabrà que no és 100% de la casa.",
=======
  "Sin merma": "Sense minva",
  "Porcionado y formato pensado para servicio. Aprovecha el 100%.":
    "Porcionat i format pensat per al servei. Aprofita el 100%.",
  "Calidad uniforme": "Qualitat uniforme",
  "Misma receta plato a plato. Tu cliente repite porque sabe a lo de siempre.":
    "Mateixa recepta plat a plat. El teu client repeteix perquè té el gust de sempre.",
  "Tu carta, tu autoría": "La teva carta, la teva autoria",
  "Te damos la base. Tú añades la firma. Nadie sabrá que no es 100% de la casa.":
    "Et donem la base. Tu hi afegeixes la firma. Ningú sabrà que no és 100% de la casa.",
  "Selección": "Selecció",
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
  "Lo que está saliendo de cocina.": "El que està sortint de cuina.",
  "Ver todos los productos HORECA": "Veure tots els productes HORECA",
  "Margen para tu negocio,": "Marge per al teu negoci,",
  "precio para tu carta": "preu per a la teva carta",
<<<<<<< HEAD
  "Una selección de productos económicos y de alta rotación para escalar márgenes sin perder criterio.": "Una selecció de productes econòmics i d'alta rotació per escalar marges sense perdre criteri.",
  "Ver todos los primer precio HORECA": "Veure tots els primer preu HORECA",
=======
  "Una selección de productos económicos y de alta rotación para escalar márgenes sin perder criterio.":
    "Una selecció de productes econòmics i d'alta rotació per escalar marges sense perdre criteri.",
  "Ver todos los primer precio HORECA": "Veure tots els primer preu HORECA",

  // Sobre Nosotros
  "+50 años seleccionando": "+50 anys seleccionant",
  "producto con criterio.": "producte amb criteri.",
  "Empresa familiar de Lleida. Nacimos como pequeño distribuidor y nos hemos convertido en partner gourmet de referencia para profesionales en toda España y Andorra.":
    "Empresa familiar de Lleida. Vam néixer com a petit distribuïdor i ens hem convertit en partner gourmet de referència per a professionals a tot Espanya i Andorra.",
  "De pequeño distribuidor": "De petit distribuïdor",
  "a partner": "a partner",
  "de referencia": "de referència",
  "1968": "1968",
  "Empieza la historia": "Comença la història",
  "Fundación en Lleida como pequeño distribuidor de producto local.":
    "Fundació a Lleida com a petit distribuïdor de producte local.",
  "1985": "1985",
  "El salto al gourmet": "El salt al gourmet",
  "Apuesta por producto de importación y denominaciones de origen.":
    "Aposta per producte d'importació i denominacions d'origen.",
  "2005": "2005",
  "Profesionalización": "Professionalització",
  "Logística propia, almacén refrigerado y red de transporte.":
    "Logística pròpia, magatzem refrigerat i xarxa de transport.",
  "Hoy": "Avui",
  "Empresa familiar profesionalizada, +200 proveedores y servicio en toda España y Andorra.":
    "Empresa familiar professionalitzada, +200 proveïdors i servei a tot Espanya i Andorra.",
  "Cómo trabajamos": "Com treballem",
  "Cerca de cada": "A prop de cada",
  "cliente.": "client.",
  "Empresa familiar": "Empresa familiar",
  "Tres generaciones. Conocemos por su nombre a los clientes que llevan décadas con nosotros.":
    "Tres generacions. Coneixem pel seu nom els clients que fa dècades que són amb nosaltres.",
  "Profesionalizada": "Professionalitzada",
  "Procesos, trazabilidad y logística propia. Te servimos como una multinacional, te tratamos como vecinos.":
    "Processos, traçabilitat i logística pròpia. Et servim com una multinacional, et tractem com veïns.",
  "Visión gourmet": "Visió gourmet",
  "Buscamos lo que aún no se conoce. Visitamos productores. Probamos antes que nadie.":
    "Busquem el que encara no es coneix. Visitem productors. Tastem abans que ningú.",
  "Innovación": "Innovació",
  "Apostamos por producto inclusivo, sin alérgenos y formatos pensados para tu negocio.":
    "Apostem per producte inclusiu, sense al·lèrgens i formats pensats per al teu negoci.",
  "¿Empezamos a": "Comencem a",
  "trabajar juntos": "treballar junts",

  // Contacto
  "Hablemos": "Parlem",
  "Estamos al otro": "Som a l'altre",
  "lado del WhatsApp.": "costat del WhatsApp.",
  "El canal principal de Aurellano es WhatsApp. Te respondemos rápido, con propuesta y precios.":
    "El canal principal d'Aurellano és WhatsApp. Et responem ràpid, amb proposta i preus.",
  "Respondemos en horas en horario laboral. Cuéntanos qué buscas.":
    "Responem en hores en horari laboral. Explica'ns què busques.",
  "Teléfono": "Telèfon",
  "Email": "Correu",
  "Instagram": "Instagram",
  "Dirección": "Adreça",
  "Horario": "Horari",
  "Lunes a Viernes": "De dilluns a divendres",
  "Zona de servicio": "Zona de servei",
  "España peninsular y Andorra.": "Espanya peninsular i Andorra.",
  "24–48h en Cataluña.": "24–48h a Catalunya.",
  "Desde 200€ portes incluidos.": "Des de 200€ ports inclosos.",
  "Pedidos en cajas completas.": "Comandes en caixes completes.",

  // Foie
  "Tradición e innovación": "Tradició i innovació",
  "Foie": "Foie",
  "en todas sus formas.": "en totes les seves formes.",
  "Mi-cuit tradicional, mi-cuit con trufa, bloc, escalopa para plancha. Y nuestra apuesta inclusiva: foie vegano de anacardo, premium e indistinguible.":
    "Mi-cuit tradicional, mi-cuit amb tòfona, bloc, escalopa per a planxa. I la nostra aposta inclusiva: foie vegà d'anacard, premium i indistingible.",
  "Hablar de foie": "Parlar de foie",
  "Tradicional + vegano.": "Tradicional + vegà.",

  // Despensa
  "La despensa": "El rebost",
  "Despensa": "Rebost",
  "gourmet.": "gourmet.",
  "Conservas, aceites, vinagres, panes, pasta y dulces. La base de cualquier cocina con criterio.":
    "Conserves, olis, vinagres, pans, pasta i dolços. La base de qualsevol cuina amb criteri.",
  "Hablar con nosotros": "Parlar amb nosaltres",

  // EspecialSin
  "Inclusivo y delicioso": "Inclusiu i deliciós",
  "Especial": "Especial",
  "\"Sin\".": "\"Sense\".",
  "Sin gluten, sin lactosa, sin huevo, vegano. Para que tu carta no excluya a nadie y tu mesa healthy no renuncie al sabor.":
    "Sense gluten, sense lactosa, sense ou, vegà. Perquè la teva carta no exclogui ningú i la teva taula healthy no renunciï al sabor.",
  "Sin gluten": "Sense gluten",
  "Sin lactosa": "Sense lactosa",
  "Sin huevo": "Sense ou",
  "Sin frutos secos": "Sense fruits secs",
  "Asesoramiento": "Assessorament",
  "Producto inclusivo, criterio gourmet.": "Producte inclusiu, criteri gourmet.",

  // Consejos
  "Saber gourmet": "Saber gourmet",
  "para profesionales": "per a professionals",
  "Maridajes, técnicas, conservación y trucos de oficio. Compartimos lo que aprendemos cada día con nuestros proveedores y clientes.":
    "Maridatges, tècniques, conservació i trucs d'ofici. Compartim el que aprenem cada dia amb els nostres proveïdors i clients.",
  "Tabla de quesos": "Taula de formatges",
  "Cómo montar una tabla de quesos memorable": "Com muntar una taula de formatges memorable",
  "Variedad de leches, intensidades y maridajes. Cantidades, orden de cata y acompañamientos imprescindibles.":
    "Varietat de llets, intensitats i maridatges. Quantitats, ordre de tast i acompanyaments imprescindibles.",
  "Foie y vinos dulces: el matrimonio perfecto": "Foie i vins dolços: el matrimoni perfecte",
  "De Sauternes a Pedro Ximénez. Por qué funcionan y cómo elegir según el tipo de foie.":
    "De Sauternes a Pedro Ximénez. Per què funcionen i com triar segons el tipus de foie.",
  "Conservación": "Conservació",
  "Conservar quesos curados sin perder cualidades": "Conservar formatges curats sense perdre qualitats",
  "Temperatura, humedad y atemperado. Errores frecuentes en cocinas profesionales.":
    "Temperatura, humitat i atemperat. Errors freqüents a cuines professionals.",
  "¿Tienes una duda concreta?": "Tens un dubte concret?",
  "Nuestro equipo lleva +50 años entre quesos, foies y despensas premium. Pregúntanos.":
    "El nostre equip porta +50 anys entre formatges, foies i rebosts premium. Pregunta'ns.",
  "Contactar": "Contactar",
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
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
