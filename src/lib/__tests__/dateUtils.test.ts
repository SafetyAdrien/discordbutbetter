import { describe, it, expect } from 'vitest';
import { format, isToday, isYesterday, isSameDay, isPast, isThisWeek, formatDistanceToNow, fr } from '@/lib/dateUtils';

describe('dateUtils (remplace date-fns)', () => {
  it('respecte les tokens FR', () => {
    const d = new Date(2024, 0, 5, 14, 30, 5);
    expect(format(d, 'd')).toBe('5');
    expect(format(d, 'dd/MM/yyyy HH:mm')).toBe('05/01/2024 14:30');
    expect(format(d, 'd MMM yyyy')).toBe('5 janv. 2024');
    expect(format(d, 'MMMM yyyy')).toBe('janvier 2024');
    expect(format(d, 'EEEE d MMMM')).toBe('vendredi 5 janvier');
  });
  it('isSameDay/isToday/isYesterday', () => {
    const now = new Date();
    expect(isSameDay(now, new Date(now.getTime() + 3600_000))).toBe(true);
    expect(isToday(now)).toBe(true);
    const y = new Date(); y.setDate(y.getDate() - 1);
    expect(isYesterday(y)).toBe(true);
  });
  it('isPast et isThisWeek', () => {
    expect(isPast(new Date(Date.now() - 10000))).toBe(true);
    expect(isPast(new Date(Date.now() + 100000))).toBe(false);
    expect(isThisWeek(new Date())).toBe(true);
  });
  it('formatDistanceToNow respecte addSuffix', () => {
    const past = new Date(Date.now() - 5 * 60_000);
    expect(formatDistanceToNow(past)).toMatch(/il y a/);
    expect(formatDistanceToNow(past, { addSuffix: false })).not.toMatch(/^il y a/);
  });
  it('exporte un objet locale compatible', () => {
    expect(fr.locale).toBe('fr');
    expect(typeof fr.format).toBe('function');
  });
});
