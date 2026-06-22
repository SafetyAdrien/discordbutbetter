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
      options: {
        isDragTrigger: (event: KeyboardEvent) => event.key === " ",
        announceItemFocus: (item: any) =>
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
