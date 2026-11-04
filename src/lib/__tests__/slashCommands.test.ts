import { describe, expect, it } from 'vitest';
import { BUILTIN_COMMANDS, frequentCommands, searchCommands } from '../slashCommands';

// Ordres relevés sur la vidéo de référence (utilisation : gif > tableflip > me).
const counts = { 'builtin:gif': 3, 'builtin:tableflip': 2, 'builtin:me': 1 };
const names = (q: string) => searchCommands(BUILTIN_COMMANDS, q, counts).map((c) => c.name);

describe('commandes slash', () => {
  it('liste "Intégré" dans l’ordre alphabétique de la vidéo', () => {
    expect(BUILTIN_COMMANDS.map((c) => c.name)).toEqual([
      'ban', 'gif', 'kick', 'me', 'msg', 'nick', 'shrug', 'spoiler', 'sticker', 'tableflip', 'thread', 'timeout', 'tts', 'unflip',
    ]);
  });

  it('/g : préfixe, puis nom contenant, puis usage, puis alphabétique', () => {
    expect(names('g').slice(0, 8)).toEqual(['gif', 'msg', 'shrug', 'tableflip', 'me', 'ban', 'spoiler', 'thread']);
  });

  it('/b : ban, tableflip, puis la description de tts', () => {
    expect(names('b')).toEqual(['ban', 'tableflip', 'tts']);
  });

  it('/gi : recherche approchée dans les descriptions', () => {
    expect(names('gi')).toEqual(['gif', 'msg', 'spoiler']);
  });

  it('fréquemment utilisés : triés par usage', () => {
    expect(frequentCommands(BUILTIN_COMMANDS, counts).map((c) => c.name)).toEqual(['gif', 'tableflip', 'me']);
  });

  it('options : /ban a deux options requises et une facultative', () => {
    const ban = BUILTIN_COMMANDS[0];
    expect(ban.options.filter((o) => o.required).map((o) => o.name)).toEqual(['user', 'delete_messages']);
    expect(ban.options.filter((o) => !o.required).map((o) => o.name)).toEqual(['reason']);
  });
});
