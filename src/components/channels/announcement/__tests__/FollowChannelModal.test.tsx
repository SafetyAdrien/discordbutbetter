import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";

// ---- Mocks de tous les hooks réseau utilisés par FollowChannelModal ----
const followMutate = vi.fn().mockResolvedValue(undefined);
const sendSystemMutate = vi.fn().mockResolvedValue(undefined);
const onSuccess = vi.fn();

vi.mock("@/hooks/useChannelFollowers", () => ({
  useAdminServers: () => ({
    data: [
      {
        id: "server-1",
        name: "Mon Serveur",
        icon_url: null,
        channels: [
          { id: "channel-1", name: "général" },
          { id: "channel-2", name: "annonces-relayées" },
        ],
      },
    ],
    isLoading: false,
  }),
  useFollowChannel: () => ({
    mutateAsync: followMutate,
    isPending: false,
  }),
  useSendFollowSystemMessage: () => ({
    mutateAsync: sendSystemMutate,
    isPending: false,
  }),
}));

import { FollowChannelModal } from "@/components/channels/announcement/FollowChannelModal";

function renderModal() {
  return render(
    <TooltipProvider>
      <FollowChannelModal
        open
        onClose={() => {}}
        sourceChannelId="source-channel"
        sourceChannelName="annonces"
        sourceServerName="Lovable Community"
        onSuccess={onSuccess}
      />
    </TooltipProvider>
  );
}

describe("FollowChannelModal — flow 'Suivre un salon sur un autre serveur'", () => {
  beforeEach(() => {
    followMutate.mockClear();
    sendSystemMutate.mockClear();
    onSuccess.mockClear();
  });

  it("affiche le salon source et propose les serveurs admin", async () => {
    renderModal();
    expect(
      screen.getByText(/Ajoute les mises à jour de ce salon à ton serveur/i)
    ).toBeInTheDocument();
    expect(screen.getByText("annonces")).toBeInTheDocument();
  });

  it("désactive le bouton Suivre tant qu'aucun salon cible n'est choisi", () => {
    renderModal();
    const followBtn = screen.getByRole("button", { name: /^Suivre$/i });
    expect(followBtn).toBeDisabled();
  });

  // Helper qui exécute tout le flow Suivre dans le viewport courant
  async function runFollowFlow() {
    renderModal();
    const user = userEvent.setup();

    const [serverTrigger, channelTrigger] = screen.getAllByRole("combobox");
    await user.click(serverTrigger);
    await user.click(await screen.findByRole("option", { name: /Mon Serveur/i }));
    await user.click(channelTrigger);
    await user.click(await screen.findByRole("option", { name: /général/i }));

    const followBtn = screen.getByRole("button", { name: /^Suivre$/i });
    expect(followBtn).not.toBeDisabled();
    await user.click(followBtn);

    expect(followMutate).toHaveBeenCalledWith({
      sourceChannelId: "source-channel",
      targetChannelId: "channel-1",
    });
    expect(sendSystemMutate).toHaveBeenCalledWith({
      targetChannelId: "channel-1",
      sourceServerName: "Lovable Community",
      sourceChannelName: "annonces",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  }

  function setViewport(width: number, height: number) {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: height });
    window.dispatchEvent(new Event("resize"));
  }

  it("[Desktop 1280×720] clic Suivre → followChannel + sendSystemMessage + onSuccess", async () => {
    setViewport(1280, 720);
    await runFollowFlow();
  });

  it("[Mobile 390×844] clic Suivre → followChannel + sendSystemMessage + onSuccess", async () => {
    setViewport(390, 844);
    await runFollowFlow();
  });

  it("(legacy) appelle followChannel + sendSystemMessage + onSuccess après sélection complète", async () => {
    renderModal();
    const user = userEvent.setup();

    // 1. Sélectionner le serveur cible (1er combobox)
    const [serverTrigger, channelTrigger] = screen.getAllByRole("combobox");
    await user.click(serverTrigger);
    const serverOption = await screen.findByRole("option", { name: /Mon Serveur/i });
    await user.click(serverOption);

    // 2. Sélectionner le salon cible (2e combobox, désormais activé)
    await user.click(channelTrigger);
    const channelOption = await screen.findByRole("option", { name: /général/i });
    await user.click(channelOption);

    // 3. Cliquer "Suivre"
    const followBtn = screen.getByRole("button", { name: /^Suivre$/i });
    expect(followBtn).not.toBeDisabled();
    await user.click(followBtn);

    expect(followMutate).toHaveBeenCalledWith({
      sourceChannelId: "source-channel",
      targetChannelId: "channel-1",
    });
    expect(sendSystemMutate).toHaveBeenCalledWith({
      targetChannelId: "channel-1",
      sourceServerName: "Lovable Community",
      sourceChannelName: "annonces",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
