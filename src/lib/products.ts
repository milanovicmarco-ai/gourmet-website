// Las imágenes viven ahora en /public/images/* y se referencian como rutas absolutas.
// Funciona tanto en bundlers (Next.js) como en scripts Node (seed).
const cheeses = "/images/cheeses.jpg";
const quesoDetalle = "/images/queso-detalle.jpg";
const conservas = "/images/conservas.jpg";
const platos = "/images/platos.jpg";
const foieVegano = "/images/foie-vegano.jpg";
const croquetas = "/images/croquetas.jpg";
const despensa = "/images/despensa.jpg";
const sinAlergenos = "/images/sin-alergenos.jpg";
const heroFoie = "/images/Restaurant_productes_gastronomics_aurellano.jpg";

export type NutritionFacts = {
  serving?: string;
  energyKcal?: number;
  fat?: string;
  saturatedFat?: string;
  carbs?: string;
  sugars?: string;
  protein?: string;
  salt?: string;
};

export type ClientType = "restaurantes" | "cafeterias" | "bares" | "establecimientos" | "tiendas-gourmet";
export type DishType = "primeros" | "segundos" | "postres" | "ingredientes" | "platos-preparados";
export type FoodCategory = "quesos" | "pasta" | "dulces" | "salado" | "bebidas";
export type Specialty = "secrets" | "delicatessen" | "limited" | "healthy";

export const CLIENT_LABELS: Record<ClientType, string> = {
  restaurantes: "Restaurantes",
  cafeterias: "Cafeterías",
  bares: "Bares",
  establecimientos: "Establecimientos",
  "tiendas-gourmet": "Tiendas gourmet",
};
export const DISH_LABELS: Record<DishType, string> = {
  primeros: "Primeros platos",
  segundos: "Segundos platos",
  postres: "Postres",
  ingredientes: "Ingredientes",
  "platos-preparados": "Platos preparados",
};
export const FOOD_LABELS: Record<FoodCategory, string> = {
  quesos: "Quesos",
  pasta: "Pasta",
  dulces: "Dulces",
  salado: "Salado",
  bebidas: "Bebidas",
};
export const SPECIALTY_LABELS: Record<Specialty, string> = {
  secrets: "Secrets du Chef",
  delicatessen: "Delicatessen",
  limited: "Edición limitada",
  healthy: "Healthy food",
};

export const HORECA_CLIENTS: ClientType[] = ["restaurantes", "cafeterias", "bares"];
export const RETAIL_CLIENTS: ClientType[] = ["establecimientos", "tiendas-gourmet"];

export type Product = {
  slug: string;
  name: string;
  brand: string;
  brandStory?: string;
  ref: string;
  category: "Quesos" | "Foie" | "Conservas" | "Platos preparados" | "Despensa" | "Especial Sin";
  description: string;
  longDescription?: string;
  origin: string;
  flavor: string;
  format: string;
  allergens: string[];
  pairings: string[];
  image: string;
  gallery?: string[];
  nutrition?: NutritionFacts;
  badges?: string[];
  // Nuevos campos para filtros
  clientTypes: ClientType[];
  dishTypes: DishType[];
  foodCategory: FoodCategory;
  specialties: Specialty[];
  vegan?: boolean;
  glutenFree?: boolean;
  lactoseFree?: boolean;
  price: number; // EUR
};

export const products: Product[] = [
  {
    slug: "manchego-curado-12m",
    name: "Manchego Curado 12 meses",
    brand: "Quesería La Mancha",
    brandStory:
      "Quesería familiar fundada en 1952 en Toledo. Tres generaciones afinando manchego DOP con leche cruda de oveja manchega de pastoreo extensivo, en cuevas naturales con humedad y temperatura controladas.",
    ref: "QM-MN12",
    category: "Quesos",
    description:
      "Pasta firme y mantecosa, con cristales de tirosina que aportan complejidad. Afinado lento en cuevas con humedad controlada.",
    longDescription:
      "Elaborado exclusivamente con leche cruda de oveja manchega de ganaderías propias. Cuajado con cuajo natural y prensado en moldes tradicionales con grabado en flor. Su afinado mínimo de 12 meses en cuevas naturales le aporta una pasta firme y untuosa con cristales de tirosina visibles, sello de la maduración prolongada. Corteza encerada, miga color marfil y un retrogusto largo con notas de avellana, mantequilla curada y heno seco. Ideal para tabla de quesos premium o rallado sobre platos calientes.",
    origin: "La Mancha, España",
    flavor: "Intenso, ligeramente picante, notas de avellana tostada",
    format: "Pieza ~3 kg / cuñas 200 g al vacío",
    allergens: ["lactosa"],
    pairings: ["Membrillo", "Vino tinto reserva", "Pan rústico"],
    image: quesoDetalle,
    gallery: [quesoDetalle, cheeses, despensa],
    nutrition: { serving: "100 g", energyKcal: 420, fat: "35 g", saturatedFat: "24 g", carbs: "0,5 g", sugars: "0,5 g", protein: "26 g", salt: "1,8 g" },
    badges: ["DOP", "Afinado 12M"],
    clientTypes: ["restaurantes", "tiendas-gourmet", "establecimientos"],
    dishTypes: ["ingredientes"],
    foodCategory: "quesos",
    specialties: ["delicatessen"],
    glutenFree: true,
    price: 28,
  },
  {
    slug: "foie-mi-cuit-tradicional",
    name: "Foie Mi-Cuit Tradicional",
    brand: "Maison Lafleur",
    brandStory:
      "Casa familiar del Sud-Ouest francés con 4 generaciones elaborando foie gras según receta tradicional. Cría propia de patos mulard alimentados con maíz local.",
    ref: "ML-FMT-500",
    category: "Foie",
    description:
      "Foie gras de pato semi-cocido al baño maría, especiado con sal marina y pimienta blanca. Textura cremosa y sabor profundo.",
    longDescription:
      "Foie gras de pato entero seleccionado, desvenado a mano. Sazonado con flor de sal de Guérande, pimienta blanca de Penja y un toque de Armagnac. Cocción lenta al baño maría a baja temperatura.",
    origin: "Sud-Ouest, Francia",
    flavor: "Untuoso, mantequilla, notas dulces",
    format: "Terrina 500 g",
    allergens: [],
    pairings: ["Higos confitados", "Brioche tostado", "Sauternes"],
    image: heroFoie,
    gallery: [heroFoie, foieVegano, conservas],
    nutrition: { serving: "30 g", energyKcal: 138, fat: "13,5 g", saturatedFat: "5,2 g", carbs: "0,8 g", sugars: "0,3 g", protein: "3,2 g", salt: "0,4 g" },
    badges: ["Premium", "Mi-cuit"],
    clientTypes: ["restaurantes", "tiendas-gourmet"],
    dishTypes: ["primeros", "ingredientes"],
    foodCategory: "salado",
    specialties: ["delicatessen", "limited"],
    glutenFree: true,
    lactoseFree: true,
    price: 42,
  },
  {
    slug: "foie-vegano-anacardo",
    name: "Fuagrà Vegano de Anacardo",
    brand: "Aurellano Selección",
    ref: "AS-FV-500",
    category: "Foie",
    description:
      "Elaborado con anacardos crudos, especias y tofu sedoso. Textura ultra-cremosa y experiencia premium inclusiva.",
    origin: "Cataluña, España",
    flavor: "Suave, umami, ligeramente dulce",
    format: "Terrina 500 g",
    allergens: ["frutos secos"],
    pairings: ["Mermelada de higo", "Pan de centeno", "Vino blanco semi-dulce"],
    image: foieVegano,
    badges: ["Vegano", "Sin gluten", "Sin lactosa"],
    clientTypes: ["restaurantes", "cafeterias", "tiendas-gourmet"],
    dishTypes: ["primeros", "ingredientes"],
    foodCategory: "salado",
    specialties: ["healthy", "delicatessen"],
    vegan: true,
    glutenFree: true,
    lactoseFree: true,
    price: 18,
  },
  {
    slug: "anchoas-cantabrico",
    name: "Anchoas del Cantábrico 00",
    brand: "Costera",
    ref: "CO-AC-50",
    category: "Conservas",
    description:
      "Anchoas de la costera de primavera, saladas en barrica y filetadas a mano. Aceite de oliva virgen extra.",
    origin: "Santoña, Cantabria",
    flavor: "Salino equilibrado, carne firme y rosada",
    format: "Lata 50 g · 8 filetes",
    allergens: ["pescado"],
    pairings: ["Pan de cristal", "Tomate maduro", "Mantequilla francesa"],
    image: conservas,
    badges: ["Premium", "Artesanal"],
    clientTypes: ["restaurantes", "bares", "tiendas-gourmet"],
    dishTypes: ["ingredientes", "primeros"],
    foodCategory: "salado",
    specialties: ["delicatessen", "limited"],
    glutenFree: true,
    lactoseFree: true,
    price: 12,
  },
  {
    slug: "canelones-xl-rustido",
    name: "Canelones XL de rustido",
    brand: "Secrets du Xef",
    ref: "SX-CX-6",
    category: "Platos preparados",
    description:
      "Pasta fresca rellena con rustido tradicional catalán de tres carnes. Bechamel ligera y generosa.",
    origin: "Cataluña, España",
    flavor: "Profundo, casero, equilibrado",
    format: "Bandeja 6 ud · 1,2 kg",
    allergens: ["gluten", "lactosa", "huevo"],
    pairings: ["Vino tinto joven", "Ensalada de escarola"],
    image: platos,
    badges: ["Listo para servir", "5ª gama"],
    clientTypes: ["restaurantes", "cafeterias", "bares"],
    dishTypes: ["primeros", "platos-preparados"],
    foodCategory: "pasta",
    specialties: ["secrets"],
    price: 22,
  },
  {
    slug: "croquetas-jamon-iberico",
    name: "Croquetas de jamón ibérico",
    brand: "Secrets du Xef",
    ref: "SX-CJ-30",
    category: "Platos preparados",
    description:
      "Bechamel artesanal con jamón ibérico de bellota cortado a cuchillo. Empanado fino, fritura limpia.",
    origin: "Cataluña, España",
    flavor: "Cremoso por dentro, crujiente por fuera",
    format: "Bolsa 30 ud · 1 kg",
    allergens: ["gluten", "lactosa", "huevo"],
    pairings: ["Vermut rojo", "Cerveza artesana"],
    image: croquetas,
    badges: ["Hostelería"],
    clientTypes: ["restaurantes", "bares", "cafeterias"],
    dishTypes: ["platos-preparados"],
    foodCategory: "salado",
    specialties: ["secrets"],
    price: 16,
  },
  {
    slug: "pan-coca-artesano",
    name: "Coca de payés artesana",
    brand: "Forn Vell",
    ref: "FV-CP-400",
    category: "Despensa",
    description: "Coca de payés con masa madre y largas fermentaciones. Corteza crujiente, miga aireada.",
    origin: "Lleida, Cataluña",
    flavor: "Trigo dulce, ligera acidez",
    format: "Pieza 400 g · congelado",
    allergens: ["gluten"],
    pairings: ["Aceite arbequina", "Tomate de penjar", "Embutidos"],
    image: despensa,
    badges: ["Masa madre"],
    clientTypes: ["restaurantes", "cafeterias", "tiendas-gourmet"],
    dishTypes: ["ingredientes"],
    foodCategory: "salado",
    specialties: ["delicatessen"],
    price: 6,
  },
  {
    slug: "pan-sin-gluten-multisemillas",
    name: "Pan sin gluten multisemillas",
    brand: "Aurellano Selección",
    ref: "AS-PSG-350",
    category: "Especial Sin",
    description: "Pan rico en semillas, sin gluten ni lactosa. Miga densa y nutritiva, ideal para tostas gourmet.",
    origin: "Cataluña, España",
    flavor: "Tostado, semillas, ligeramente dulce",
    format: "Pieza 350 g",
    allergens: [],
    pairings: ["Aguacate", "Salmón", "Hummus"],
    image: sinAlergenos,
    badges: ["Sin gluten", "Sin lactosa", "Vegano"],
    clientTypes: ["cafeterias", "tiendas-gourmet", "establecimientos"],
    dishTypes: ["ingredientes"],
    foodCategory: "salado",
    specialties: ["healthy"],
    vegan: true,
    glutenFree: true,
    lactoseFree: true,
    price: 8,
  },
  // -------- Demo extra para que cada filtro tenga resultados --------
  {
    slug: "burrata-pugliese-fresca",
    name: "Burrata Pugliese fresca",
    brand: "Caseificio Andriese",
    ref: "CA-BP-250",
    category: "Quesos",
    description: "Corazón de stracciatella cremosa envuelto en mozzarella tierna. Producción diaria, recibida en 48h.",
    origin: "Puglia, Italia",
    flavor: "Lácteo dulce, cremoso, fresco",
    format: "Bola 250 g",
    allergens: ["lactosa"],
    pairings: ["Tomate raf", "Aceite arbequina", "Pesto fresco"],
    image: cheeses,
    badges: ["Fresco", "Importación directa"],
    clientTypes: ["restaurantes", "tiendas-gourmet"],
    dishTypes: ["primeros", "ingredientes"],
    foodCategory: "quesos",
    specialties: ["delicatessen", "limited"],
    glutenFree: true,
    price: 9,
  },
  {
    slug: "tartar-atun-rojo",
    name: "Tartar de atún rojo Balfegó",
    brand: "Secrets du Xef",
    ref: "SX-TA-120",
    category: "Platos preparados",
    description: "Atún rojo de almadraba marinado con soja, sésamo y aguacate. Listo para emplatar como entrante premium.",
    origin: "Tarragona, España",
    flavor: "Yodado, umami, fresco",
    format: "Tarrina 120 g",
    allergens: ["pescado", "gluten"],
    pairings: ["Wasabi", "Lima", "Brioche"],
    image: heroFoie,
    badges: ["Premium", "Listo para emplatar"],
    clientTypes: ["restaurantes"],
    dishTypes: ["primeros", "platos-preparados"],
    foodCategory: "salado",
    specialties: ["secrets", "limited"],
    lactoseFree: true,
    price: 14,
  },
  {
    slug: "solomillo-wellington",
    name: "Solomillo Wellington",
    brand: "Secrets du Xef",
    ref: "SX-SW-1K",
    category: "Platos preparados",
    description: "Solomillo de ternera nacional envuelto en hojaldre, duxelles de champiñón y jamón serrano.",
    origin: "Cataluña, España",
    flavor: "Profundo, mantecoso, terroso",
    format: "Pieza 1 kg",
    allergens: ["gluten", "huevo", "lactosa"],
    pairings: ["Vino tinto reserva", "Patata trufada"],
    image: platos,
    badges: ["Premium", "Festivo"],
    clientTypes: ["restaurantes", "bares"],
    dishTypes: ["segundos", "platos-preparados"],
    foodCategory: "salado",
    specialties: ["secrets", "limited"],
    price: 38,
  },
  {
    slug: "coulant-chocolate-70",
    name: "Coulant de chocolate 70%",
    brand: "Pastry Lab",
    ref: "PL-CC-12",
    category: "Platos preparados",
    description: "Coulant individual de chocolate negro 70% con corazón fluido. Horneado al momento desde congelado.",
    origin: "Bélgica",
    flavor: "Cacao intenso, amargo elegante",
    format: "Caja 12 ud · 80 g",
    allergens: ["gluten", "lactosa", "huevo"],
    pairings: ["Helado vainilla", "Frutos rojos"],
    image: croquetas,
    badges: ["Postre estrella"],
    clientTypes: ["restaurantes", "cafeterias"],
    dishTypes: ["postres", "platos-preparados"],
    foodCategory: "dulces",
    specialties: ["secrets", "delicatessen"],
    price: 19,
  },
  {
    slug: "tarta-zanahoria-vegana",
    name: "Tarta de zanahoria vegana sin gluten",
    brand: "Aurellano Selección",
    ref: "AS-TZ-1",
    category: "Especial Sin",
    description: "Bizcocho jugoso de zanahoria y nueces sin gluten ni lactosa, con frosting de anacardo.",
    origin: "Cataluña, España",
    flavor: "Especiado dulce, cremoso",
    format: "Tarta 8 raciones",
    allergens: ["frutos secos"],
    pairings: ["Té chai", "Café especialidad"],
    image: sinAlergenos,
    badges: ["Vegano", "Sin gluten", "Sin lactosa"],
    clientTypes: ["cafeterias", "tiendas-gourmet"],
    dishTypes: ["postres"],
    foodCategory: "dulces",
    specialties: ["healthy", "delicatessen"],
    vegan: true,
    glutenFree: true,
    lactoseFree: true,
    price: 24,
  },
  {
    slug: "kombucha-jengibre-limon",
    name: "Kombucha jengibre y limón",
    brand: "Vital Ferments",
    ref: "VF-KJ-330",
    category: "Despensa",
    description: "Bebida fermentada artesana, baja en azúcar, viva y refrescante. Bote 330 ml.",
    origin: "Girona, Cataluña",
    flavor: "Ácido cítrico, picante suave",
    format: "Caja 12 botellas 330 ml",
    allergens: [],
    pairings: ["Brunch", "Quesos curados"],
    image: despensa,
    badges: ["Bio", "Vegano"],
    clientTypes: ["cafeterias", "bares", "tiendas-gourmet", "establecimientos"],
    dishTypes: ["ingredientes"],
    foodCategory: "bebidas",
    specialties: ["healthy"],
    vegan: true,
    glutenFree: true,
    lactoseFree: true,
    price: 4,
  },
  {
    slug: "vermut-reserva-familiar",
    name: "Vermut reserva familiar",
    brand: "Bodega Roca",
    ref: "BR-VR-750",
    category: "Despensa",
    description: "Vermut rojo macerado con 27 botánicos. Edición limitada anual, numerada a mano.",
    origin: "Reus, Cataluña",
    flavor: "Amargo dulce, especiado, redondo",
    format: "Botella 750 ml",
    allergens: [],
    pairings: ["Anchoas", "Olivas", "Patatas chip"],
    image: conservas,
    badges: ["Edición limitada", "Numerada"],
    clientTypes: ["restaurantes", "bares", "tiendas-gourmet"],
    dishTypes: ["ingredientes"],
    foodCategory: "bebidas",
    specialties: ["limited", "delicatessen"],
    vegan: true,
    glutenFree: true,
    lactoseFree: true,
    price: 22,
  },
  {
    slug: "miel-romero-cruda",
    name: "Miel de romero cruda",
    brand: "Apicultors del Pirineu",
    ref: "AP-MR-500",
    category: "Despensa",
    description: "Miel monofloral de romero del Prepirineo, sin filtrar ni pasteurizar. Cristalización natural.",
    origin: "Pallars, Cataluña",
    flavor: "Floral, dulce limpio, herbáceo",
    format: "Tarro 500 g",
    allergens: [],
    pairings: ["Quesos azules", "Yogur griego", "Tostas"],
    image: despensa,
    badges: ["Cruda", "Km 0"],
    clientTypes: ["restaurantes", "cafeterias", "tiendas-gourmet", "establecimientos"],
    dishTypes: ["ingredientes", "postres"],
    foodCategory: "dulces",
    specialties: ["healthy", "delicatessen"],
    vegan: true,
    glutenFree: true,
    lactoseFree: true,
    price: 11,
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export const allergenIcons: Record<string, string> = {
  gluten: "🌾",
  lactosa: "🥛",
  huevo: "🥚",
  "frutos secos": "🥜",
  pescado: "🐟",
};
