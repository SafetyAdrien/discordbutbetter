import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "@/components/icons/discord/lucide";
import { ChevronDown, Clock, Webhook as WebhookIcon } from "@/components/icons/serverSettingsIcons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChannels } from "@/hooks/useChannels";
import { useMembers } from "@/hooks/useMembers";
import {
  useCreateWebhook,
  useDeleteWebhook,
  useServerWebhooks,
  useUpdateWebhook,
  type Webhook,
} from "@/hooks/useWebhooks";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { SettingsPage, UnsavedChangesBar } from "./SettingsUI";
import { settingsInputCls, settingsLinkCls } from "./settingsStyles";

import { appLocale } from '@/i18n/locale';
/*
 * "Integrations" puis "Integrations > Webhooks" (video de reference) :
 * cartes depliables par webhook avec nom, salon, copie de l'URL et
 * suppression ; "Nouveau webhook" en cree un dans le premier salon textuel.
 */

export function IntegrationsPage({ serverId }: { serverId: string }) {
  const [view, setView] = useState<"overview" | "webhooks">("overview");
  const { data } = useChannels(serverId);
  const textChannels = useMemo(
    () => (data ? [...data.orphanChannels, ...data.categories.flatMap((c) => c.channels)].filter((c) => c.type === "text") : []),
    [data],
  );
  const { data: webhooks = [] } = useServerWebhooks(serverId, textChannels.map((c) => c.id));

  if (view === "webhooks") {
    return <WebhooksView serverId={serverId} textChannels={textChannels} webhooks={webhooks} onBack={() => setView("overview")} />;
  }

  return (
    <SettingsPage
      title="Intégrations"
      description="Personnalise ton serveur avec des intégrations. Gère les webhooks qui publient des messages depuis d'autres applications."
    >
      <button
        type="button"
        onClick={() => setView("webhooks")}
        className="w-full flex items-center gap-4 p-4 rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--interactive-background-hover))] text-left transition-colors"
      >
        <span className="w-10 h-10 shrink-0 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center">
          <WebhookIcon className="w-5 h-5 text-foreground" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold text-white">Webhooks</span>
          <span className="block text-sm text-muted-foreground">
            {webhooks.length} webhook{webhooks.length > 1 ? "s" : ""}
          </span>
        </span>
        <span className="text-sm font-medium text-foreground">{webhooks.length > 0 ? "Voir les webhooks" : "Créer un webhook"}</span>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </SettingsPage>
  );
}

function WebhooksView({
  serverId,
  textChannels,
  webhooks,
  onBack,
}: {
  serverId: string;
  textChannels: { id: string; name: string }[];
  webhooks: Webhook[];
  onBack: () => void;
}) {
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const { data: members = [] } = useMembers(serverId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; channelId: string }>>({});

  // Cle stable : `webhooks` vaut un nouveau `[]` a chaque rendu tant que la
  // requete n'a rien renvoye, ce qui relancait cet effet en boucle.
  const webhooksKey = webhooks.map((w) => `${w.id}:${w.name}:${w.channel_id}`).join("|");
  useEffect(() => setDrafts({}), [webhooksKey]);

  const draftOf = (w: Webhook) => drafts[w.id] ?? { name: w.name, channelId: w.channel_id };
  const dirtyIds = webhooks.filter((w) => {
    const d = drafts[w.id];
    return d && (d.name !== w.name || d.channelId !== w.channel_id);
  });
  const creatorName = (id: string | null) => members.find((m) => m.user.id === id)?.user.username ?? "inconnu";
  const channelName = (id: string) => textChannels.find((c) => c.id === id)?.name ?? "salon";

  const create = () => {
    const first = textChannels[0];
    if (!first) return;
    createWebhook.mutate(
      { channelId: first.id, name: `Webhook ${webhooks.length + 1}` },
      { onSuccess: (w) => w && setOpenId((w as Webhook).id) },
    );
  };

  const save = () => {
    dirtyIds.forEach((w) => {
      const d = drafts[w.id];
      updateWebhook.mutate({
        webhookId: w.id,
        name: d.name !== w.name ? d.name.trim() || w.name : undefined,
        channelId: d.channelId !== w.channel_id ? d.channelId : undefined,
      });
    });
  };

  return (
    <SettingsPage
      title={
        <span className="flex items-center gap-1.5">
          <button type="button" onClick={onBack} className="text-muted-foreground hover:text-white hover:underline">Intégrations</button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          Webhooks
        </span>
      }
      description={
        <>
          Les webhooks sont une manière simple de poster des messages dans tes salons à partir d'autres applications ou
          sites web.{" "}
          <a href="/trust" target="_blank" rel="noopener" className={settingsLinkCls}>En savoir plus</a>
        </>
      }
    >
      <Button size="sm" onClick={create} disabled={!textChannels.length || createWebhook.isPending}>
        Nouveau webhook
      </Button>

      <div className="mt-6 space-y-2">
        {webhooks.length === 0 && <p className="text-sm text-muted-foreground">Aucun webhook pour l'instant.</p>}
        {webhooks.map((w) => {
          const open = openId === w.id;
          const d = draftOf(w);
          return (
            <div key={w.id} className="rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : w.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={w.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-white"><WebhookIcon className="w-5 h-5" /></AvatarFallback>
                </Avatar>
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-semibold text-white truncate">{w.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Créé le {w.created_at ? new Date(w.created_at).toLocaleDateString(appLocale(), { day: "numeric", month: "short", year: "numeric" }) : "—"} par {creatorName(w.created_by)} · #{channelName(w.channel_id)}
                  </span>
                </span>
                <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="px-4 pb-4 pt-1 border-t border-border">
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-xs font-semibold text-foreground">Nom</label>
                      <input
                        value={d.name}
                        maxLength={80}
                        onChange={(e) => setDrafts((all) => ({ ...all, [w.id]: { ...d, name: e.target.value } }))}
                        className={settingsInputCls}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-xs font-semibold text-foreground">Salon</label>
                      <select
                        value={d.channelId}
                        onChange={(e) => setDrafts((all) => ({ ...all, [w.id]: { ...d, channelId: e.target.value } }))}
                        className={settingsInputCls}
                      >
                        {textChannels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(`${window.location.origin}/api/webhooks/${w.token}`, "URL du webhook copiée !")}
                    >
                      Copier l'URL du webhook
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => deleteWebhook.mutate({ webhookId: w.id, channelId: w.channel_id })}
                      className="text-destructive hover:text-destructive"
                    >
                      Suppression de webhook
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <UnsavedChangesBar visible={dirtyIds.length > 0} onReset={() => setDrafts({})} onSave={save} saving={updateWebhook.isPending} />
    </SettingsPage>
  );
}
