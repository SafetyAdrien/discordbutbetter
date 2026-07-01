import { useEffect, useState } from 'react';

/**
 * Surveille les éléments `[data-settings-section-id]` à l'intérieur de
 * `containerRef` et retourne l'id de la section actuellement la plus
 * proche du haut du panneau visible — sert à surligner la bonne sous-entrée
 * de nav pendant que l'utilisateur scrolle.
 */
export function useSettingsScrollSpy(
  containerRef: React.RefObject<HTMLElement | null>,
  sectionIds: ReadonlyArray<string>,
): string | null {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);
  const sectionIdsKey = sectionIds.join('|');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sectionIds.length === 0) {
      setActiveId(null);
      return;
    }

    setActiveId(sectionIds[0]);

    const elements = sectionIds
      .map((id) => container.querySelector<HTMLElement>(`[data-settings-section-id="${id}"]`))
      .filter((el): el is HTMLElement => !!el);

    if (elements.length === 0) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let closest: { id: string; distance: number } | null = null;
      for (const el of elements) {
        const id = el.dataset.settingsSectionId;
        if (!id) continue;
        const distance = el.getBoundingClientRect().top - containerTop;
        if (distance <= 24 && (closest === null || distance > closest.distance)) {
          closest = { id, distance };
        }
      }
      setActiveId(closest?.id ?? sectionIds[0]);
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, sectionIdsKey]);

  return activeId;
}

/** Scrolle en douceur jusqu'à une section donnée à l'intérieur du conteneur. */
export function scrollToSettingsSection(container: HTMLElement | null, sectionId: string) {
  const el = container?.querySelector(`[data-settings-section-id="${sectionId}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
