import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Catalogo from "./pages/Catalogo.tsx";
import Quesos from "./pages/Quesos.tsx";
import Foie from "./pages/Foie.tsx";
import SecretsDelXef from "./pages/SecretsDelXef.tsx";
import Despensa from "./pages/Despensa.tsx";
import EspecialSin from "./pages/EspecialSin.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import SobreNosotros from "./pages/SobreNosotros.tsx";
import Condiciones from "./pages/Condiciones.tsx";
import Contacto from "./pages/Contacto.tsx";
import Consejos from "./pages/Consejos.tsx";
import Colmado from "./pages/Colmado.tsx";
import { I18nProvider } from "@/lib/i18n";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/quesos" element={<Quesos />} />
          <Route path="/foie" element={<Foie />} />
          <Route path="/secrets-du-xef" element={<SecretsDelXef />} />
          <Route path="/despensa" element={<Despensa />} />
          <Route path="/colmado" element={<Colmado />} />
          <Route path="/especial-sin" element={<EspecialSin />} />
          <Route path="/producto/:slug" element={<ProductDetail />} />
          <Route path="/sobre-nosotros" element={<SobreNosotros />} />
          <Route path="/condiciones" element={<Condiciones />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/inspiracion" element={<Consejos />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
