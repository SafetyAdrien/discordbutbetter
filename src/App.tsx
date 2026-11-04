import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TitleTooltips } from "@/components/ui/TitleTooltips";
import { UserSettingsEffects } from '@/components/UserSettingsEffects';
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
const Auth = lazy(() => import("./pages/Auth"));
const Invite = lazy(() => import("./pages/Invite"));
const Install = lazy(() => import("./pages/Install"));
const AdminBadges = lazy(() => import("./pages/AdminBadges"));
const DesignHarness = lazy(() => import("./pages/DesignHarness"));
const Trust = lazy(() => import("./pages/Trust"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
import { useCacheRehydrate } from "@/hooks/useCacheRehydrate";
import { useUrlMetadataRealtime } from "@/hooks/useUrlMetadata";
import { CustomThemeTintLayer } from "@/components/appearance/CustomThemeTintLayer";
import { CustomThemeSheetHost } from "@/components/appearance/CustomThemeSheetHost";
import { BirthdayLoginCelebration } from "@/components/birthday/BirthdayLoginCelebration";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useRealtimeResync } from "@/hooks/useRealtimeResync";

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

import { DesktopShell } from '@/components/desktop/DesktopShell';

/* Dans AuthProvider : rattrape les evenements temps reel manques apres une coupure (voir useRealtimeResync). */
const RealtimeResyncBridge = () => {
  useRealtimeResync();
  return null;
};

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
        <RealtimeResyncBridge />
        <UserSettingsEffects />
        <CustomThemeTintLayer />
        <CustomThemeSheetHost />
        <BirthdayLoginCelebration />
        <PresenceProvider>
          <VoiceProvider>
            <TooltipProvider delayDuration={0}>
              <TitleTooltips />
              <DndProvider options={dndMultiBackendPipeline}>
                <DesktopShell>
                <BrowserRouter>
                  <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/invite/:code" element={<Invite />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/admin/badges" element={<RequireAuth><AdminBadges /></RequireAuth>} />
                    <Route path="/trust" element={<Trust />} />
                    {/* Harnais de design : hors RequireAuth, donnees fictives. */}
                    <Route path="/design" element={<DesignHarness />} />
                    <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                </BrowserRouter>
                </DesktopShell>
                <PerfOverlay />
                {/* Doit vivre dans ThemeProvider (resolvedTheme) et hors
                    BrowserRouter : couvre toutes les routes. */}
                <Toaster position="bottom-right" richColors closeButton />
              </DndProvider>
            </TooltipProvider>
          </VoiceProvider>
        </PresenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);


export default App;
