import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChannelEventModal } from '@/components/channels/calendar/ChannelEventModal';

// --- Mocks ---
const createMutate = vi.fn().mockResolvedValue({ id: 'evt-1' });
const updateMutate = vi.fn();
const removeMutate = vi.fn();

vi.mock('@/hooks/useChannelCalendarEvents', () => ({
  useChannelCalendarEvents: () => ({
    create: { mutateAsync: createMutate, isPending: false },
    update: { mutateAsync: updateMutate, isPending: false },
    remove: { mutateAsync: removeMutate, isPending: false },
  }),
  uploadEventThumbnail: vi.fn(),
}));

vi.mock('@/hooks/useChannels', () => ({
  useChannels: () => ({ data: { categories: [], orphanChannels: [] } }),
}));

vi.mock('@/components/ui/responsive-modal', () => ({
  ResponsiveModal: ({ children, open }: any) => (open ? <div role="dialog">{children}</div> : null),
}));

// Stub the canvas editor so file selection doesn't matter here
vi.mock('@/components/channels/calendar/ThumbnailCanvasEditor', () => ({
  ThumbnailCanvasEditor: () => null,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));

describe('ChannelEventModal — Journée entière (e2e modal)', () => {
  beforeEach(() => {
    createMutate.mockClear();
  });

  it('publie un évènement avec une date unique, all_day=true et sans heures', async () => {
    render(
      <ChannelEventModal
        open
        onOpenChange={() => {}}
        channelId="chan-1"
        serverId="srv-1"
        initialDate={new Date('2026-07-15T12:34:56')}
        editing={null}
      />,
    );

    // Title required
    fireEvent.change(screen.getByLabelText(/Titre/i), { target: { value: 'Journée Off' } });

    // Toggle "Journée entière"
    const allDaySwitch = screen.getByLabelText(/Journée entière/i);
    fireEvent.click(allDaySwitch);

    // Time inputs must be gone, single Date input present
    expect(screen.queryByLabelText(/Début/i)).toBeNull();
    expect(screen.queryByLabelText(/Fin/i)).toBeNull();
    expect(document.querySelectorAll('input[type="time"]').length).toBe(0);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(1);

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Créer/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));

    const payload = createMutate.mock.calls[0][0];
    expect(payload.all_day).toBe(true);
    expect(payload.title).toBe('Journée Off');

    const starts = new Date(payload.starts_at);
    const ends = new Date(payload.ends_at);

    // Same calendar day
    expect(starts.toDateString()).toBe(ends.toDateString());
    // Start at 00:00, end at 23:59:59
    expect(starts.getHours()).toBe(0);
    expect(starts.getMinutes()).toBe(0);
    expect(starts.getSeconds()).toBe(0);
    expect(ends.getHours()).toBe(23);
    expect(ends.getMinutes()).toBe(59);
    expect(ends.getSeconds()).toBe(59);
  });
});
