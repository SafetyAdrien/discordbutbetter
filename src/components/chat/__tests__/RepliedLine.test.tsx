import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RepliedLine } from "@/components/chat/RepliedLine";
import type { RepliedMessageRef } from "@/types/app";

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("RepliedLine", () => {
  const repliedMessage: RepliedMessageRef = {
    id: "msg-1",
    content: "Salut tout le monde",
    attachments: [],
    deleted: false,
    author: {
      id: "user-1",
      username: "alice",
      displayName: "Alice",
      avatar: undefined,
    },
  };

  it("affiche le pseudo et le contenu cités du message d'origine", () => {
    renderWithProviders(<RepliedLine repliedMessage={repliedMessage} />);
    expect(screen.getByText("@Alice")).toBeInTheDocument();
    expect(screen.getByText(/Salut tout le monde/)).toBeInTheDocument();
  });

  it("déclenche onJump avec l'id du message cité quand on clique", async () => {
    const onJump = vi.fn();
    renderWithProviders(
      <RepliedLine repliedMessage={repliedMessage} onJump={onJump} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Aller au message original/i }));
    expect(onJump).toHaveBeenCalledWith("msg-1");
  });

  it("affiche un état 'supprimé' lorsque le message d'origine est marqué deleted", () => {
    renderWithProviders(
      <RepliedLine
        repliedMessage={{ ...repliedMessage, deleted: true, content: "" }}
      />
    );
    expect(screen.getByText(/Message original supprimé/i)).toBeInTheDocument();
  });
});
