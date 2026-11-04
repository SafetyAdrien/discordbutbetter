import { useEffect, useState } from "react";
import { ShieldPlus } from "lucide-react";
import { ArrowLeft, ChevronRight, Mail, MessageCircle } from "@/components/icons/discord/lucide";
import { AutoModArt as Bot, ShieldUser as ShieldCheck, CheckCircle2 } from "@/components/icons/serverSettingsIcons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useServerSettings, useUpdateServerSettings, type VerificationLevel } from "@/hooks/useServerSettings";
import { useServerRoles, useUpdateRole, type ServerPermission } from "@/hooks/useRoles";
import { RISKY_PERMISSIONS } from "@/lib/riskyPermissions";
import { ComingSoonBadge, SettingsPage } from "./SettingsUI";
import { AutoModSettings } from "./AutoModSettings";

/*
 * "Configuration de Securite" (video de reference) : quatre cartes
 * (raids et CAPTCHA, MP et spams, AutoMod, permissions) qui ouvrent chacune
 * leur page avec "Retour". Reutilisee a l'etape 1 du processus d'accueil.
 *
 * Appliques par la base : niveau de verification (trigger sur les messages),
 * regles AutoMod et retrait des permissions risquees de @everyone. Le reste
 * (dossier de spams, CAPTCHA, A2F des moderateurs...) demande une
 * infrastructure que l'app n'a pas encore : "Bientot disponible".
 */

const VERIFICATION_LEVELS: { id: VerificationLevel | "highest"; label: string; hint: string; disabled?: boolean }[] = [
  { id: "none", label: "Aucun", hint: "Aucune restriction" },
  { id: "low", label: "Faible", hint: "Doit avoir une adresse e-mail vérifiée." },
  { id: "medium", label: "Moyen", hint: "Doit aussi être inscrit(e) sur l'app depuis plus de 5 minutes." },
  { id: "high", label: "Élevé", hint: "Doit aussi être membre de ce serveur depuis plus de 10 minutes." },
  { id: "highest", label: "Très élevé", hint: "Doit avoir un numéro de téléphone vérifié.", disabled: true },
];

type Section = "raids" | "dms" | "automod" | "permissions";

function Badge({ icon: Icon, className }: { icon: React.ElementType; className: string }) {
  return (
    <span className={cn("w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white", className)}>
      <Icon className="w-5 h-5" />
    </span>
  );
}

function OptionCard({
  title,
  description,
  right,
  soon,
  children,
  onClick,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  soon?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn("p-4 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]", onClick && "cursor-pointer hover:bg-[hsl(var(--interactive-background-hover))]")}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-white">
            {title}
            {soon && <ComingSoonBadge />}
          </p>
          {description && <p className="mt-1 text-sm leading-[18px] text-foreground">{description}</p>}
          {children}
        </div>
        {right}
      </div>
    </div>
  );
}

function SoonSwitch() {
  return <Switch checked={false} disabled aria-label="Bientôt disponible" className="shrink-0" />;
}

export function SecuritySetupPanel({ serverId, title = "Configuration de Sécurité" }: { serverId: string; title?: string }) {
  const { data: settings } = useServerSettings(serverId);
  const update = useUpdateServerSettings();
  const { data: roles = [] } = useServerRoles(serverId);
  const updateRole = useUpdateRole();
  const [section, setSection] = useState<Section | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const level = settings?.verification_level ?? "none";
  const [pending, setPending] = useState<VerificationLevel>(level);
  useEffect(() => setPending(level), [level]);

  const everyone = roles.find((r) => r.is_default);
  const everyonePerms = (everyone?.permissions ?? []) as ServerPermission[];
  const riskyActive = RISKY_PERMISSIONS.filter((p) => everyonePerms.includes(p.id));
  const automod = settings?.automod_rules;
  const automodOn = (automod?.mention_spam.enabled ? 1 : 0) + (automod?.custom.enabled ? 1 : 0);
  const current = VERIFICATION_LEVELS.find((l) => l.id === level) ?? VERIFICATION_LEVELS[0];

  const cards: { id: Section; title: string; summary: string; badge: React.ReactNode }[] = [
    { id: "raids", title: "Protection contre les raids et CAPTCHA", summary: "Bientôt disponible", badge: <Badge icon={ShieldPlus} className="bg-gradient-to-br from-[#f0b232] to-[#e67e22]" /> },
    { id: "dms", title: "Protection contre les MP et les spams", summary: level !== "none" ? `Vérification : ${current.label}` : "Aucune vérification", badge: <Badge icon={MessageCircle} className="bg-gradient-to-br from-[#3ba55c] to-[#45ddc0]" /> },
    { id: "automod", title: "AutoMod", summary: `${automodOn} sur 2 activé(s)`, badge: <Bot className="w-9 h-9 shrink-0" /> },
    { id: "permissions", title: "Permissions", summary: riskyActive.length === 0 ? "1 sur 1 activé(s)" : "0 sur 1 activé(s)", badge: <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-[#eb459e] to-[#ed4245]"><ShieldCheck className="w-6 h-6" /></span> },
  ];

  const back = (
    <button type="button" onClick={() => setSection(null)} className="mb-5 flex items-center gap-2 text-base font-medium text-foreground hover:text-white">
      <ArrowLeft className="w-5 h-5" /> Retour
    </button>
  );

  if (section === "automod") {
    return (
      <div>
        {back}
        <AutoModSettings serverId={serverId} />
      </div>
    );
  }

  return (
    <SettingsPage title={section ? undefined : title}>
      {!section && (
        <div className="rounded-lg border border-white/[0.06] bg-[hsl(var(--card))] divide-y divide-white/[0.06]">
          {cards.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-4">
              {c.badge}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white">{c.title}</p>
                <p className="text-xs text-foreground">{c.summary}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSection(c.id)}>Modifier</Button>
            </div>
          ))}
        </div>
      )}

      {section === "raids" && (
        <>
          {back}
          <h2 className="mb-4 text-xl font-semibold text-white">Protection contre les raids et CAPTCHA</h2>
          <div className="space-y-2">
            <OptionCard soon title="Activer la protection contre les raids" description="Les membres qui rejoignent en masse doivent passer un CAPTCHA avant de pouvoir accéder au serveur." right={<SoonSwitch />} />
            <OptionCard soon title="CAPTCHA pour les comptes suspects" description="Les comptes jugés suspects doivent résoudre un CAPTCHA avant de rejoindre ton serveur." right={<SoonSwitch />} />
            <OptionCard soon title="Alertes d'activité" description="Reçois une alerte dans le salon de notifications de sécurité en cas d'activité anormale." right={<SoonSwitch />} />
          </div>
        </>
      )}

      {section === "dms" && (
        <>
          {back}
          <h2 className="mb-4 text-xl font-semibold text-white">Protection contre les MP et les spams</h2>
          <div className="space-y-2">
            <OptionCard
              title="Niveau de vérification"
              description="Les membres du serveur doivent remplir les critères suivants avant de pouvoir envoyer des messages. Si un membre a un rôle attribué, cela ne s'applique pas."
              onClick={() => setPickerOpen(true)}
              right={<ChevronRight className="w-5 h-5 text-[hsl(var(--icon-default))]" />}
            >
              <span className="mt-2 inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-[hsl(var(--button-secondary))] text-xs text-foreground">
                <Mail className="w-3.5 h-3.5" /> {current.label}
              </span>
            </OptionCard>
            <OptionCard soon title="Masquer les MP des utilisateurs suspects" description="Envoie les MP suspects dans un dossier de spams à part. Les membres peuvent signaler une escroquerie ou déplacer les messages dans la boîte de réception." right={<SoonSwitch />} />
            <OptionCard soon title="Filtrer les MP des utilisateurs inconnus" description="Filtre les MP des utilisateurs inconnus vers la boîte de réception des demandes de message. Les membres doivent approuver la demande avant de pouvoir y répondre." right={<SoonSwitch />} />
            <OptionCard soon title="Préviens les membres avant qu'ils ne se rendent sur les liens externes" right={<SoonSwitch />} />
            <OptionCard soon title="Masquer tous les messages des spammeurs présumés et supprimer ces derniers" right={<SoonSwitch />} />
          </div>
        </>
      )}

      {section === "permissions" && (
        <>
          {back}
          <h2 className="mb-4 text-xl font-semibold text-white">Permissions</h2>
          <div className="space-y-2">
            <OptionCard soon title="Exiger une A2F pour les actions des modérateurs" description="Les modérateurs doivent obligatoirement activer l'authentification à deux facteurs pour pouvoir bannir, expulser ou exclure temporairement des membres, ainsi que pour effacer des messages." right={<SoonSwitch />} />
            <OptionCard soon title="Limiter le congédiement des membres aux admins" description="Seuls les administrateurs et administratrices et le ou la propriétaire du serveur peuvent congédier les membres inactifs lorsque ce paramètre est activé." right={<SoonSwitch />} />
            <OptionCard
              title="Supprime les permissions risquées de @everyone"
              description={`@everyone a actuellement ${riskyActive.length} permission${riskyActive.length > 1 ? "s" : ""} risquée${riskyActive.length > 1 ? "s" : ""} activée${riskyActive.length > 1 ? "s" : ""}`}
              right={
                riskyActive.length === 0 ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-[hsl(var(--online))]" />
                ) : (
                  <Button
                    size="sm"
                    disabled={!everyone || updateRole.isPending}
                    onClick={() => {
                      if (!everyone) return;
                      const risky = new Set(RISKY_PERMISSIONS.map((p) => p.id));
                      updateRole.mutate({ roleId: everyone.id, serverId, permissions: everyonePerms.filter((p) => !risky.has(p)) });
                    }}
                  >
                    Supprimer
                  </Button>
                )
              }
            />
          </div>
        </>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[440px] p-6 gap-0">
          <DialogTitle className="text-xl font-semibold text-white">Niveau de vérification</DialogTitle>
          <DialogDescription className="mt-1 mb-5 text-sm text-muted-foreground">
            Choisis les critères à remplir avant de pouvoir écrire sur ton serveur. Le propriétaire et les administrateurs ne sont jamais concernés.
          </DialogDescription>
          <RadioGroup value={pending} onValueChange={(v) => setPending(v as VerificationLevel)} className="gap-2">
            {VERIFICATION_LEVELS.map((l) => (
              <label
                key={l.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--card))] cursor-pointer",
                  pending === l.id && "ring-1 ring-primary",
                  l.disabled && "opacity-60 cursor-not-allowed",
                )}
              >
                <RadioGroupItem value={l.id} disabled={l.disabled} className="mt-0.5 h-5 w-5 border-2 border-[hsl(var(--header-icon))] text-white data-[state=checked]:border-white" />
                <span>
                  <span className="flex items-center gap-2 text-base font-medium text-white">
                    {l.label}
                    {l.disabled && <ComingSoonBadge />}
                  </span>
                  <span className="block text-sm text-muted-foreground">{l.hint}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>Annuler</Button>
            <Button
              disabled={update.isPending}
              onClick={() => {
                if (pending !== level) update.mutate({ serverId, settings: { verification_level: pending } });
                setPickerOpen(false);
              }}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  );
}

export function SecuritySettings({ serverId }: { serverId: string }) {
  return <SecuritySetupPanel serverId={serverId} />;
}
