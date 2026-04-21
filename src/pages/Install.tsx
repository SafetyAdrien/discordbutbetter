import { useNavigate } from "react-router-dom";
import {
  Download,
  Share,
  MoreVertical,
  CheckCircle2,
  Smartphone,
  Zap,
  WifiOff,
  Bell,
  Maximize2,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { haptics } from "@/lib/haptics";

const Install = () => {
  const navigate = useNavigate();
  const { canInstall, isInstalled, isIOS, promptInstall, dismiss } = usePWAInstall();

  const handleInstall = async () => {
    haptics.light();
    const choice = await promptInstall();
    if (choice.outcome === "dismissed") dismiss();
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-5 max-w-sm w-full">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Déjà installée !</h1>
            <p className="text-muted-foreground text-sm">
              BCord est installée sur votre appareil. Vous pouvez la lancer depuis votre écran d'accueil.
            </p>
          </div>
          <Button
            className="w-full rounded-full h-11"
            onClick={() => (window.location.href = "/")}
          >
            Ouvrir BCord
          </Button>
        </div>
      </div>
    );
  }

  const benefits = [
    { icon: Maximize2, label: "Plein écran sans navigateur" },
    { icon: Zap, label: "Lancement instantané" },
    { icon: WifiOff, label: "Fonctionne hors-ligne" },
    { icon: Bell, label: "Notifications activables" },
  ];

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center h-12 px-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="w-10 h-10 rounded-full flex items-center justify-center text-foreground active:bg-muted/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground ml-1">Installer l'app</h1>
        </div>
      </div>

      <div className="px-6 py-8 max-w-md mx-auto space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden shadow-elevation-3 bg-card">
            <img
              src="/pwa-192x192.png"
              alt="BCord"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Installer BCord</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Profite de BCord en plein écran, comme une vraie application native.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <ul className="grid grid-cols-2 gap-2.5">
          {benefits.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 rounded-2xl bg-muted/40 p-3"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">
                {label}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA / Instructions */}
        {canInstall ? (
          <div className="space-y-3">
            <Button
              onClick={handleInstall}
              className="w-full gap-2 rounded-full h-12 text-base"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Installer l'application
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Une fenêtre de confirmation va s'afficher.
            </p>
          </div>
        ) : isIOS ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground px-1">
              Sur Safari (iPhone / iPad)
            </h2>
            <ol className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              <Step
                num={1}
                icon={<Share className="w-5 h-5 text-primary" />}
                text={
                  <>
                    Appuie sur le bouton <strong>Partager</strong> en bas de l'écran
                  </>
                }
              />
              <Step
                num={2}
                icon={<Plus className="w-5 h-5 text-primary" />}
                text={
                  <>
                    Choisis <strong>« Sur l'écran d'accueil »</strong>
                  </>
                }
              />
              <Step
                num={3}
                icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
                text={
                  <>
                    Appuie sur <strong>Ajouter</strong> en haut à droite
                  </>
                }
              />
            </ol>
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground px-1">
              Dans ton navigateur
            </h2>
            <ol className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              <Step
                num={1}
                icon={<MoreVertical className="w-5 h-5 text-primary" />}
                text={
                  <>
                    Ouvre le menu <strong>⋮</strong> en haut à droite
                  </>
                }
              />
              <Step
                num={2}
                icon={<Download className="w-5 h-5 text-primary" />}
                text={
                  <>
                    Choisis <strong>« Installer l'application »</strong>
                  </>
                }
              />
              <Step
                num={3}
                icon={<Smartphone className="w-5 h-5 text-primary" />}
                text={<>L'icône BCord apparaît sur ton écran d'accueil</>}
              />
            </ol>
          </section>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Aucune donnée supplémentaire n'est collectée.
        </p>
      </div>
    </div>
  );
};

function Step({
  num,
  icon,
  text,
}: {
  num: number;
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 p-4">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{text}</p>
      </div>
      <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center">
        {num}
      </span>
    </li>
  );
}

export default Install;
