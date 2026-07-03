import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { PerfOverlay } from "@/components/dev/PerfOverlay";
import { DndProvider } from "react-dnd-multi-backend";
import { dndMultiBackendPipeline } from "@/lib/dnd-shim/multi-backend";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Invite from "./pages/Invite";
import Install from "./pages/Install";
import AdminBadges from "./pages/AdminBadges";
import Trust from "./pages/Trust";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";
import { useCacheRehydrate } from "@/hooks/useCacheRehydrate";
import { useUrlMetadataRealtime } from "@/hooks/useUrlMetadata";
import { CustomThemeTintLayer } from "@/components/appearance/CustomThemeTintLayer";
import { CustomThemeSheetHost } from "@/components/appearance/CustomThemeSheetHost";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const CacheRehydrateBridge = () => {
  useCacheRehydrate();
  useUrlMetadataRealtime();
  return null;
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <CacheRehydrateBridge />
      <AuthProvider>
        <CustomThemeTintLayer />
        <CustomThemeSheetHost />
        <Toaster />
        <PresenceProvider>
          <VoiceProvider>
            <TooltipProvider delayDuration={0}>
              <DndProvider options={dndMultiBackendPipeline}>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/invite/:code" element={<Invite />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/admin/badges" element={<AdminBadges />} />
                    <Route path="/trust" element={<Trust />} />
                    <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
                <PerfOverlay />
              </DndProvider>
            </TooltipProvider>
          </VoiceProvider>
        </PresenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);


export default App;
