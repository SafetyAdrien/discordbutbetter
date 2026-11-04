import { describe, expect, it } from 'vitest';
import {
  buildIcs,
  formatEventWhen,
  formatOccurrence,
  googleCalendarUrl,
  parseTimeInput,
  recurrenceOptions,
  recurrenceSummary,
  rrule,
  upcomingOccurrences,
} from '@/lib/serverEvents';

// Vendredi 23 octobre 2026, 09:35 (heure locale)
const START = new Date(2026, 9, 23, 9, 35);
const base = { starts_at: START.toISOString(), canceled_occurrences: [] as string[], status: 'scheduled' as const };

describe('serverEvents', () => {
  it('propose les frequences de Discord pour la date', () => {
    const labels = recurrenceOptions(START).map((o) => o.label);
    expect(labels).toEqual([
      'Ne recommence pas',
      'Toutes les semaines, le vendredi',
      'Un vendredi sur deux',
      'Tous les mois, le quatrième vendredi du mois',
      'Tous les ans, le 23 oct.',
      'Tous les jours',
      'Tous les jours de la semaine (du lundi au vendredi)',
    ]);
    expect(recurrenceSummary('weekly', START)).toBe('Recommence chaque vendredi');
  });

  it('calcule les occurrences hebdomadaires en sautant les annulées', () => {
    const now = new Date(2026, 9, 23, 9, 18);
    const occ = upcomingOccurrences(
      { ...base, recurrence: 'weekly', canceled_occurrences: [new Date(2026, 9, 30, 9, 35).toISOString()] },
      now,
      3,
    );
    expect(occ.map((d) => d.getDate())).toEqual([23, 6, 13]);
  });

  it('gère le n-ième jour du mois et les événements uniques', () => {
    const occ = upcomingOccurrences({ ...base, recurrence: 'monthly_nth' }, START, 3);
    // 4e vendredi : 23 oct., 27 nov., 25 déc.
    expect(occ.map((d) => [d.getMonth(), d.getDate()])).toEqual([[9, 23], [10, 27], [11, 25]]);
    expect(upcomingOccurrences({ ...base, recurrence: 'none' }, START, 3)).toHaveLength(1);
    expect(upcomingOccurrences({ ...base, recurrence: 'none' }, new Date(2026, 9, 24), 3)).toHaveLength(0);
  });

  it('saute le week-end pour "jours de la semaine"', () => {
    const occ = upcomingOccurrences({ ...base, recurrence: 'weekdays' }, START, 3);
    expect(occ.map((d) => d.getDay())).toEqual([5, 1, 2]);
  });

  it('formate comme Discord', () => {
    expect(formatEventWhen(START, new Date(2026, 9, 23, 9, 18))).toBe('Commence dans 17 min');
    expect(formatOccurrence(new Date(2026, 9, 30, 8, 35))).toBe('ven. oct. 30 · 08:35');
  });

  it('produit des liens et un ICS récurrents', () => {
    const p = { title: 'Titre', description: 'Desc', location: 'Général', start: START, recurrence: 'weekly' as const, uid: 'e1' };
    expect(rrule('monthly_nth', START)).toBe('FREQ=MONTHLY;BYDAY=4FR');
    expect(googleCalendarUrl(p)).toContain('recur=RRULE%3AFREQ%3DWEEKLY');
    const ics = buildIcs(p);
    expect(ics).toContain('RRULE:FREQ=WEEKLY');
    expect(ics).toContain('SUMMARY:Titre');
  });

  it('lit une heure saisie à la main', () => {
    expect(parseTimeInput('9')).toBe('09:00');
    expect(parseTimeInput('9:3')).toBe('09:30');
    expect(parseTimeInput('21h45')).toBe('21:45');
    expect(parseTimeInput('25')).toBeNull();
  });
});
