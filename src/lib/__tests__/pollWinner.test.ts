import { describe, expect, it } from 'vitest';
import { computePollWinner } from '../pollWinner';

describe('computePollWinner', () => {
  const options = [
    { id: 'a', text: 'Réponse A' },
    { id: 'b', text: 'Réponse B' },
    { id: 'c', text: 'Réponse C' },
  ];

  it("signale l'absence de vainqueur s'il n'y a aucun vote", () => {
    expect(computePollWinner({ options, votes: [] })).toEqual({
      hasWinner: false,
      label: "Il n'y a pas eu de vainqueur",
      winnerOptionId: null,
      winnerPercentage: null,
    });
  });

  it('désigne l\'option gagnante en cas de majorité nette', () => {
    const votes = [
      { option_id: 'a' },
      { option_id: 'a' },
      { option_id: 'b' },
    ];
    expect(computePollWinner({ options, votes })).toEqual({
      hasWinner: true,
      label: 'Réponse A',
      winnerOptionId: 'a',
      winnerPercentage: 67,
    });
  });

  it('signale une égalité et liste les options concernées en cas d\'égalité stricte', () => {
    const votes = [
      { option_id: 'a' },
      { option_id: 'b' },
    ];
    expect(computePollWinner({ options, votes })).toEqual({
      hasWinner: false,
      label: 'Égalité entre Réponse A, Réponse B',
      winnerOptionId: null,
      winnerPercentage: null,
    });
  });

  it('désigne la seule option ayant reçu des votes parmi plusieurs à zéro', () => {
    const votes = [{ option_id: 'c' }];
    expect(computePollWinner({ options, votes })).toEqual({
      hasWinner: true,
      label: 'Réponse C',
      winnerOptionId: 'c',
      winnerPercentage: 100,
    });
  });
});
