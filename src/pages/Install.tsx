import { useState, useEffect } from "react";
import { Download, Share, MoreVertical, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Déjà installée !</h1>
          <p className="text-muted-foreground">
            NexusChat est installée sur votre appareil. Vous pouvez la lancer depuis votre écran d'accueil.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Ouvrir NexusChat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-lg">
          <img src="/pwa-192x192.png" alt="NexusChat" className="w-full h-full object-cover" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Installer NexusChat</h1>
          <p className="text-muted-foreground text-sm">
            Installez l'app sur votre écran d'accueil pour un accès rapide en plein écran.
          </p>
        </div>

        {deferredPrompt ? (
          <Button onClick={handleInstall} className="w-full gap-2" size="lg">
            <Download className="w-5 h-5" />
            Installer l'application
          </Button>
        ) : isIOS ? (
          <div className="bg-muted rounded-xl p-4 text-left space-y-3 text-sm text-foreground">
            <p className="font-semibold">Sur Safari :</p>
            <div className="flex items-start gap-3">
              <Share className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
              <p>Appuyez sur le bouton <strong>Partager</strong> en bas de l'écran</p>
            </div>
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
              <p>Puis <strong>Sur l'écran d'accueil</strong></p>
            </div>
          </div>
        ) : (
          <div className="bg-muted rounded-xl p-4 text-left space-y-3 text-sm text-foreground">
            <p className="font-semibold">Dans votre navigateur :</p>
            <div className="flex items-start gap-3">
              <MoreVertical className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
              <p>Appuyez sur le menu <strong>⋮</strong> en haut à droite</p>
            </div>
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
              <p>Puis <strong>Installer l'application</strong></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
