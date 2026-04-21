import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UniversalMessageContextMenu } from "@/components/chat/UniversalMessageContextMenu";

// Force desktop layout (skip mobile long-press sheet)
vi.mock("@/hooks/useBreakpoint", () => ({
  useBreakpoint: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  }),
}));

function renderMenu(overrides: Partial<React.ComponentProps<typeof UniversalMessageContextMenu>> = {}) {
  const onReply = vi.fn();
  const onCopyText = vi.fn();
  const onCopyLink = vi.fn();
  const onCopyId = vi.fn();
  const onAddReaction = vi.fn();

  render(
    <TooltipProvider>
      <UniversalMessageContextMenu
        messageId="msg-1"
        isOwnMessage={false}
        onReply={onReply}
        onCopyText={onCopyText}
        onCopyLink={onCopyLink}
        onCopyId={onCopyId}
        onAddReaction={onAddReaction}
        {...overrides}
      >
        <div data-testid="message-row">Hello</div>
      </UniversalMessageContextMenu>
    </TooltipProvider>
  );

  return { onReply, onCopyText, onCopyLink, onCopyId, onAddReaction };
}

describe("UniversalMessageContextMenu (Desktop)", () => {
  it("affiche un item 'Répondre' en tête du menu contextuel et appelle onReply au clic", async () => {
    const { onReply } = renderMenu();
    const user = userEvent.setup();

    // Right-click on the message row to open Radix ContextMenu
    await user.pointer({
      target: screen.getByTestId("message-row"),
      keys: "[MouseRight]",
    });

    const replyItem = await screen.findByRole("menuitem", { name: /Répondre/i });
    expect(replyItem).toBeInTheDocument();
    await user.click(replyItem);
    expect(onReply).toHaveBeenCalledTimes(1);
  });
});
