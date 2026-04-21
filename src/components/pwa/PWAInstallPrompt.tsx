import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { haptics } from "@/lib/haptics";

export function PWAInstallPrompt() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { canInstall, isInstalled, isIOS, promptInstall, isDismissed, dismiss } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    if (isInstalled) return;
    if (location.pathname.startsWith("/install")) return;
    if (location.pathname.startsWith("/auth")) return;
    if (isDismissed()) return;

    // Show after a short delay so it doesn't interrupt initial load
    const t = setTimeout(() => {
      if (canInstall || isIOS) setVisible(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [isMobile, isInstalled, canInstall, isIOS, isDismissed, location.pathname]);

  if (!isMobile || isInstalled || !visible) return null;

  const handleInstall = async () => {
    haptics.light();
    if (canInstall) {
      const choice = await promptInstall();
      if (choice.outcome === "dismissed") dismiss();
      setVisible(false);
    } else {
      // iOS or no native prompt: send to install page
      setVisible(false);
      navigate("/install");
    }
  };

  const handleClose = () => {
    haptics.light();
    dismiss();
    setVisible(false);
  };

  const handleLater = () => {
    haptics.light();
    dismiss();
    setVisible(false);
  };

  return (
    <div
      className="fixed left-0 right-0 z-[200] px-3 animate-in slide-in-from-bottom duration-300"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
      role="dialog"
      aria-label="Installer l'application"
    >
      <div className="mx-auto max-w-md rounded-2xl bg-card border border-border shadow-elevation-3 p-4 flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Installe BCord
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajoute l'app à ton écran d'accueil pour un accès instantané.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" className="h-8 rounded-full px-4" onClick={handleInstall}>
              {canInstall ? "Installer" : "Voir comment"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full px-3 text-muted-foreground"
              onClick={handleLater}
            >
              Plus tard
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fermer"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
