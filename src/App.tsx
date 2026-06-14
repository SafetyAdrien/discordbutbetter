import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { PerfOverlay } from "@/components/dev/PerfOverlay";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Invite from "./pages/Invite";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PresenceProvider>
        <VoiceProvider>
          <TooltipProvider delayDuration={0}>
            
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/invite/:code" element={<Invite />} />
                <Route path="/install" element={<Install />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <PerfOverlay />
          </TooltipProvider>
        </VoiceProvider>
      </PresenceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
