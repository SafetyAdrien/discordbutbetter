import { describe, expect, it } from 'vitest';
import { REMINDER_PRESETS, combineDateTime, parseTime, relativeReminder } from '../reminders';

const at = (id: string, now: Date) => REMINDER_PRESETS.find((p) => p.id === id)!.at(now);

describe('reminders', () => {
  const now = new Date(2026, 9, 30, 11, 50); // vendredi 30 oct. 2026
  it('presets relatifs et horaires fixes', () => {
    expect(at('30m', now).getTime() - now.getTime()).toBe(30 * 60_000);
    expect(at('1h', now).getHours()).toBe(12);
    const tomorrow = at('tomorrow', now);
    expect([tomorrow.getDate(), tomorrow.getMonth(), tomorrow.getHours(), tomorrow.getMinutes()]).toEqual([31, 9, 9, 0]);
    const monday = at('monday', now);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(2);
    expect(monday.getMonth()).toBe(10);
  });
  it("le prochain lundi n'est jamais aujourd'hui", () => {
    const mon = new Date(2026, 10, 2, 8, 0);
    expect(at('monday', mon).getDate()).toBe(9);
  });
  it('format relatif', () => {
    expect(relativeReminder(new Date(now.getTime() + 2 * 60_000), now)).toEqual({ text: 'Rappel dans 2 minutes', overdue: false });
    expect(relativeReminder(new Date(now.getTime() + 60 * 60_000), now).text).toBe('Rappel dans 1 heure');
    expect(relativeReminder(new Date(now.getTime() - 1000), now).overdue).toBe(true);
  });
  it('analyse des heures saisies', () => {
    expect(parseTime('11:53')).toBe('11:53');
    expect(parseTime('9h30')).toBe('09:30');
    expect(parseTime('930')).toBe('09:30');
    expect(parseTime('7')).toBe('07:00');
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(combineDateTime(now, '14:15').getHours()).toBe(14);
  });
});
