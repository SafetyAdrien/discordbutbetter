// MultiBackend pipeline: HTML5 (desktop) + Touch (mobile) + Accessible (keyboard/SR)
// Mirrors Discord's public configuration of react-dnd-accessible-backend.
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { MouseTransition, TouchTransition } from "dnd-multi-backend";
import { announce } from "@react-aria/live-announcer";
import AccessibleBackend from "react-dnd-accessible-backend";

const announceFr = (message: string) => {
  try {
    announce(message, "assertive");
  } catch {
    /* no-op in non-browser env */
  }
};

export const dndMultiBackendPipeline = {
  backends: [
    {
      id: "html5",
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: "touch",
      backend: TouchBackend,
      options: {
        delayTouchStart: 120,
        touchSlop: 8,
        enableMouseEvents: false,
        ignoreContextMenu: true,
        scrollAngleRanges: [
          { start: 30, end: 150 },
          { start: 210, end: 330 },
        ],
      },
      preview: true,
      transition: TouchTransition,
    },
    {
      id: "accessible",
      backend: AccessibleBackend,
      context: {
        window: typeof window !== "undefined" ? window : undefined,
        document: typeof document !== "undefined" ? document : undefined,
      },
      preview: true,
      options: {
        preview: true,
        isDragTrigger: (event: KeyboardEvent) => event.key === " ",
        announceItemFocus: (_item: any) =>
          `Élément sélectionnable. Appuyez sur Espace pour le déplacer.`,
        announceBeginDrag: () => "Déplacement commencé. Utilisez les flèches pour naviguer, Espace pour déposer, Échap pour annuler.",
        announceCancelDrag: () => "Déplacement annulé.",
        announceEndDrag: () => "Élément déposé.",
        announceMovedToTarget: () => "Cible mise à jour.",
        getAnnouncementMessages: () => ({
          pickedUpItem: announceFr,
          movedItem: announceFr,
          droppedItem: announceFr,
          canceledDrag: announceFr,
        }),
      },
    },
  ],
};

// ============================================================================
// Defensive DOM purge — removes any preview node that the accessible backend
// (or its predecessors) may have appended to <body> and forgotten to detach
// after a drop. Mirrors `DragPreviewer.clear()` from
// discord/react-dnd-accessible-backend.
// ============================================================================
if (typeof window !== "undefined") {
  const purgeStrayPreviews = () => {
    if (typeof document === "undefined") return;
    const previews = document.querySelectorAll<HTMLElement>(".drag-previewer");
    previews.forEach((el) => {
      // Keep the backend-owned container/SVG attached so future drags can render,
      // but clear any cloned content that got stuck after cancel/drop.
      el.querySelectorAll<HTMLElement>("foreignObject").forEach((foreignObject) => {
        foreignObject.innerHTML = "";
      });
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
    });
  };
  const purgeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") purgeStrayPreviews();
  };
  const purgeOnVisibilityChange = () => {
    if (document.visibilityState === "hidden") purgeStrayPreviews();
  };
  const events = ["drop", "dragend", "pointerup", "pointercancel", "mouseup", "touchend", "touchcancel", "blur", "pagehide"] as const;
  events.forEach((eventName) =>
    window.addEventListener(eventName, purgeStrayPreviews, { capture: true, passive: true }),
  );
  window.addEventListener("keydown", purgeOnEscape, { capture: true });
  document.addEventListener("visibilitychange", purgeOnVisibilityChange, { capture: true });
}
