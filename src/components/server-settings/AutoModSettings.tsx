import { useEffect, useState } from "react";
import { AtSign } from "@/components/icons/discord/lucide";
import { MessageBlock as Ban, Frown, ListPlus, Lines as Menu } from "@/components/icons/serverSettingsIcons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_AUTOMOD_RULES,
  useServerSettings,
  useUpdateServerSettings,
  type AutoModRules,
} from "@/hooks/useServerSettings";
import { ComingSoonBadge, SettingsDivider, SettingsPage, SettingsSection, SettingsValueRow } from "./SettingsUI";
import { settingsHelpCls, settingsInputCls, settingsLabelCls, settingsLinkCls, settingsTextareaCls } from "./settingsStyles";

/*
 * Page "AutoMod" (video de reference). Deux regles sont appliquees par la
 * base a l'envoi d'un message (trigger enforce_server_message_rules) :
 * spam de mentions et mots personnalises. Les deux autres reposent sur une
 * detection automatique que l'app n'a pas encore.
 */

function ActionChip() {
  return (
    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded bg-[hsl(var(--button-secondary))] text-xs text-muted-foreground">
      <Ban className="w-3 h-3" />
      bloquer un message
    </span>
  );
}

function RuleCard({
  icon: Icon,
  title,
  description,
  enabled,
  configured,
  actionLabel,
  onAction,
  onToggle,
  comingSoon,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled?: boolean;
  configured?: boolean;
  actionLabel: string;
  onAction?: () => void;
  onToggle?: (v: boolean) => void;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
      <span className="w-10 h-10 shrink-0 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center text-foreground">
        <Icon className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-white">
          {title}
          {comingSoon && <ComingSoonBadge />}
        </p>
        <p className="mt-0.5 text-sm leading-[18px] text-muted-foreground">{description}</p>
        {!comingSoon && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <ActionChip />
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-3">
        {configured && onToggle && <Switch checked={!!enabled} onCheckedChange={onToggle} aria-label={`Activer : ${title}`} />}
        <Button size="sm" onClick={onAction} disabled={comingSoon} variant={configured ? "secondary" : "default"}>
          {configured ? "Modifier" : actionLabel}
        </Button>
      </div>
    </div>
  );
}

export function AutoModSettings({ serverId }: { serverId: string }) {
  const { data: settings } = useServerSettings(serverId);
  const update = useUpdateServerSettings();
  const rules = settings?.automod_rules ?? DEFAULT_AUTOMOD_RULES;
  const [dialog, setDialog] = useState<null | "mentions" | "custom">(null);

  const save = (next: AutoModRules) => update.mutate({ serverId, settings: { automod_rules: next } });
  const mentionsConfigured = rules.mention_spam.enabled || rules.mention_spam.limit !== DEFAULT_AUTOMOD_RULES.mention_spam.limit;
  const customConfigured = rules.custom.keywords.length > 0;

  return (
    <SettingsPage
      title="AutoMod"
      description={
        <>
          Maintiens ton serveur sûr tout en laissant tes modérateurs se reposer ! Configure des filtres de modération de
          contenu : AutoMod bloque les messages concernés avant qu'ils ne soient publiés.{" "}
          <a href="/trust" target="_blank" rel="noopener" className={settingsLinkCls}>En savoir plus</a>
        </>
      }
    >
      <h3 className="mb-3 text-xl font-semibold text-white">Contenu</h3>
      <div className="flex flex-col gap-2">
        <RuleCard
          icon={AtSign}
          title="Bloquer les spams de mentions"
          description="Bloque les messages avec un nombre excessif de mentions de rôles ou d'utilisateurs"
          enabled={rules.mention_spam.enabled}
          configured={mentionsConfigured}
          actionLabel="Configurer"
          onAction={() => setDialog("mentions")}
          onToggle={(v) => save({ ...rules, mention_spam: { ...rules.mention_spam, enabled: v } })}
        />
        <RuleCard
          icon={Frown}
          title="Bloquer le contenu suspecté de spam"
          description="Surveille les messages, les posts de forum et les fils à la recherche de contenu ou d'activité considérés comme des spams."
          actionLabel="Configurer"
          comingSoon
        />
        <RuleCard
          icon={Menu}
          title="Bloquer les mots fréquemment signalés"
          description="Signale les messages qui incluent du contenu obscène entre autres."
          actionLabel="Configurer"
          comingSoon
        />
        <RuleCard
          icon={ListPlus}
          title="Bloquer des mots personnalisés"
          description="Crée ton propre filtre pour bloquer un type de langage précis sur ton serveur."
          enabled={rules.custom.enabled}
          configured={customConfigured}
          actionLabel="Créer"
          onAction={() => setDialog("custom")}
          onToggle={(v) => save({ ...rules, custom: { ...rules.custom, enabled: v } })}
        />
      </div>

      <SettingsDivider />

      <SettingsSection
        title={<span className="flex items-center gap-2">Filtres de contenu sensible <ComingSoonBadge /></span>}
        description="Choisis si les membres du serveur peuvent partager du contenu média à base d'images détecté par les filtres de contenu sensible. Ce paramètre s'appliquera aux salons qui ne sont pas soumis à une limite d'âge."
      >
        <SettingsValueRow value="Ne pas filtrer" hint="Les messages ne seront pas filtrés pour du contenu média à base d'images sensibles." disabled />
      </SettingsSection>

      <MentionSpamDialog
        open={dialog === "mentions"}
        rules={rules}
        onClose={() => setDialog(null)}
        onSave={(next) => {
          save(next);
          setDialog(null);
        }}
      />
      <CustomWordsDialog
        open={dialog === "custom"}
        rules={rules}
        onClose={() => setDialog(null)}
        onSave={(next) => {
          save(next);
          setDialog(null);
        }}
      />
    </SettingsPage>
  );
}

function MentionSpamDialog({
  open,
  rules,
  onClose,
  onSave,
}: {
  open: boolean;
  rules: AutoModRules;
  onClose: () => void;
  onSave: (r: AutoModRules) => void;
}) {
  const [limit, setLimit] = useState(String(rules.mention_spam.limit));
  useEffect(() => {
    if (open) setLimit(String(rules.mention_spam.limit));
  }, [open, rules.mention_spam.limit]);
  const n = Number(limit);
  const valid = Number.isInteger(n) && n >= 1 && n <= 50;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-6 gap-0">
        <DialogTitle className="text-xl font-semibold text-white">Bloquer les spams de mentions</DialogTitle>
        <DialogDescription className="mt-1 mb-5 text-sm text-muted-foreground">
          Un message qui contient plus de mentions (rôles et utilisateurs) que cette limite est bloqué.
        </DialogDescription>
        <label htmlFor="mention-limit" className={settingsLabelCls}>Limite de mentions par message</label>
        <input id="mention-limit" type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(e.target.value)} className={settingsInputCls} />
        <p className={`mt-1.5 ${settingsHelpCls}`}>Entre 1 et 50.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button disabled={!valid} onClick={() => onSave({ ...rules, mention_spam: { enabled: true, limit: n } })}>
            Enregistrer la règle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const splitWords = (text: string) =>
  Array.from(new Set(text.split(/[\n,]/).map((w) => w.trim()).filter(Boolean))).slice(0, 1000);

function CustomWordsDialog({
  open,
  rules,
  onClose,
  onSave,
}: {
  open: boolean;
  rules: AutoModRules;
  onClose: () => void;
  onSave: (r: AutoModRules) => void;
}) {
  const [keywords, setKeywords] = useState("");
  const [allow, setAllow] = useState("");
  useEffect(() => {
    if (open) {
      setKeywords(rules.custom.keywords.join(", "));
      setAllow(rules.custom.allow.join(", "));
    }
  }, [open, rules.custom.keywords, rules.custom.allow]);
  const words = splitWords(keywords);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-6 gap-0">
        <DialogTitle className="text-xl font-semibold text-white">Bloquer des mots personnalisés</DialogTitle>
        <DialogDescription className="mt-1 mb-5 text-sm text-muted-foreground">
          Les messages contenant l'un de ces mots ou expressions sont bloqués (sans tenir compte des majuscules).
        </DialogDescription>
        <label htmlFor="automod-keywords" className={settingsLabelCls}>Mots-clés bloqués</label>
        <textarea id="automod-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Sépare les mots par une virgule ou un retour à la ligne" className={settingsTextareaCls} />
        <p className={`mt-1.5 ${settingsHelpCls}`}>{words.length} / 1000 mots-clés</p>
        <label htmlFor="automod-allow" className={`${settingsLabelCls} mt-5`}>Mots autorisés</label>
        <textarea id="automod-allow" value={allow} onChange={(e) => setAllow(e.target.value)} placeholder="Mots qui contiennent un mot-clé mais restent autorisés" className={settingsTextareaCls} />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button
            disabled={words.length === 0}
            onClick={() => onSave({ ...rules, custom: { enabled: true, keywords: words, allow: splitWords(allow) } })}
          >
            Enregistrer la règle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
