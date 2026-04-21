import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render } from "@testing-library/react";
import { SwipeToReplyRow } from "@/components/mobile/SwipeToReplyRow";

/**
 * Régression critique : SwipeToReplyRow doit être un forwardRef pour que
 * <ContextMenuTrigger asChild> de Radix puisse y attacher sa ref. Sans ça,
 * le clic-droit Desktop est cassé.
 */
describe("SwipeToReplyRow", () => {
  it("forward la ref vers son <div> racine quand enabled = true", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SwipeToReplyRow ref={ref} enabled onReply={() => {}}>
        <span>child</span>
      </SwipeToReplyRow>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("forward la ref vers son <div> racine quand enabled = false (passthrough)", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SwipeToReplyRow ref={ref} enabled={false} onReply={() => {}}>
        <span>child</span>
      </SwipeToReplyRow>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
