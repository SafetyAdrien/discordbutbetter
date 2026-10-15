export interface PollWinnerInput {
  options: { id: string; text: string }[];
  votes: { option_id: string }[];
}

export interface PollWinnerResult {
  /** true only when exactly one option has the strictly highest vote count. */
  hasWinner: boolean;
  label: string;
  /** id of the winning option, set only when hasWinner is true. */
  winnerOptionId: string | null;
  /** share of the total votes the winning option received, set only when hasWinner is true. */
  winnerPercentage: number | null;
}

export function computePollWinner({ options, votes }: PollWinnerInput): PollWinnerResult {
  if (votes.length === 0) {
    return { hasWinner: false, label: "Il n'y a pas eu de vainqueur", winnerOptionId: null, winnerPercentage: null };
  }

  const counts = new Map<string, number>();
  options.forEach((o) => counts.set(o.id, 0));
  votes.forEach((v) => counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1));

  const max = Math.max(...counts.values());
  const winners = options.filter((o) => counts.get(o.id) === max);

  if (max === 0) {
    return { hasWinner: false, label: "Il n'y a pas eu de vainqueur", winnerOptionId: null, winnerPercentage: null };
  }
  if (winners.length === 1) {
    return {
      hasWinner: true,
      label: winners[0].text,
      winnerOptionId: winners[0].id,
      winnerPercentage: Math.round((max / votes.length) * 100),
    };
  }
  return {
    hasWinner: false,
    label: `Égalité entre ${winners.map((o) => o.text).join(', ')}`,
    winnerOptionId: null,
    winnerPercentage: null,
  };
}
