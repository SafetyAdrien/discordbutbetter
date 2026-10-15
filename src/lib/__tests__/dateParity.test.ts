import { describe, it, expect } from 'vitest';
// Imported by absolute path so the `date-fns` -> `dateUtils` alias in
// vite.config.ts does NOT apply here: this suite compares the replacement
// against the real library, so it must load the original.
import { format as realFormat } from '../../../node_modules/date-fns/format.js';
import { isSameDay } from '../../../node_modules/date-fns/isSameDay.js';
import { isPast } from '../../../node_modules/date-fns/isPast.js';
import { startOfDay } from '../../../node_modules/date-fns/startOfDay.js';
import { endOfDay } from '../../../node_modules/date-fns/endOfDay.js';
import { startOfMonth } from '../../../node_modules/date-fns/startOfMonth.js';
import { endOfMonth } from '../../../node_modules/date-fns/endOfMonth.js';
import { isSameMonth } from '../../../node_modules/date-fns/isSameMonth.js';
import { addMonths } from '../../../node_modules/date-fns/addMonths.js';
import { subMonths } from '../../../node_modules/date-fns/subMonths.js';
import { isAfter } from '../../../node_modules/date-fns/isAfter.js';
import { differenceInCalendarDays } from '../../../node_modules/date-fns/differenceInCalendarDays.js';
import { eachDayOfInterval } from '../../../node_modules/date-fns/eachDayOfInterval.js';
import { addDays } from '../../../node_modules/date-fns/addDays.js';
const df = { format: realFormat, isSameDay, isPast, startOfDay, endOfDay, startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths, isAfter, differenceInCalendarDays, eachDayOfInterval, addDays };
import { fr as dffr } from '../../../node_modules/date-fns/locale.js';
import * as mine from '@/lib/dateUtils';

const DATES = [new Date(2024,0,5,14,30,5), new Date(2023,10,28,9,5,0), new Date(2025,6,4,23,59,59), new Date(2024,1,29,12,0,0)];
const PATTERNS = ['d','dd/MM','dd MMM yyyy','dd MMM yyyy, HH:mm','dd/MM/yyyy HH:mm','d MMM','d MMMM yyyy','EEE','EEEE d MMMM','HH:mm','MMM','MMMM yyyy','PPP','PPP à HH:mm','yyyy-MM-dd'];

describe('parité date-fns → dateUtils', () => {
  it.each(PATTERNS)('format %s', (p) => {
    for (const d of DATES) expect(mine.format(d, p), `${p} / ${d}`).toBe(df.format(d, p, { locale: dffr }));
  });
  for (const d of DATES) {
    it(`helpers pour ${d.toISOString().slice(0,10)}`, () => {
      expect(mine.isSameDay(d, new Date(d.getTime()+3600_000))).toBe(df.isSameDay(d, new Date(d.getTime()+3600_000)));
      expect(mine.isPast(d)).toBe(df.isPast(d));
      expect(mine.startOfDay(d).getTime()).toBe(df.startOfDay(d).getTime());
      expect(mine.endOfDay(d).getTime()).toBe(df.endOfDay(d).getTime());
      expect(mine.startOfMonth(d).getTime()).toBe(df.startOfMonth(d).getTime());
      expect(mine.endOfMonth(d).getTime()).toBe(df.endOfMonth(d).getTime());
      expect(mine.isSameMonth(d, d)).toBe(df.isSameMonth(d, d));
      expect(mine.isSameMonth(d, df.addMonths(d,2))).toBe(df.isSameMonth(d, df.addMonths(d,2)));
      expect(mine.isAfter(d, new Date(d.getTime()-1))).toBe(df.isAfter(d, new Date(d.getTime()-1)));
      for (const n of [-2,-1,0,1,2]) {
        expect(mine.addMonths(d,n).getTime(), `addMonths ${n}`).toBe(df.addMonths(d,n).getTime());
        expect(mine.subMonths(d,n).getTime(), `subMonths ${n}`).toBe(df.subMonths(d,n).getTime());
      }
      const e = df.addDays(d, 5);
      expect(mine.differenceInCalendarDays(e, d)).toBe(df.differenceInCalendarDays(e, d));
      expect(mine.differenceInCalendarDays(d, e)).toBe(df.differenceInCalendarDays(d, e));
      expect(mine.eachDayOfInterval({start: df.startOfMonth(d), end: df.endOfMonth(d)}).length)
        .toBe(df.eachDayOfInterval({start: df.startOfMonth(d), end: df.endOfMonth(d)}).length);
    });
  }
});
