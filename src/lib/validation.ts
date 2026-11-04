/*
 * Validations d'entree legeres (contenu d'un message, identifiant). Elles remplacent zod dans les modules charges au
 * demarrage : la bibliotheque (~115 Ko avant minification) alourdissait le fichier principal pour deux regles simples.
 */

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

export const MESSAGE_MAX_LENGTH = 2000;

/** Contenu rogne ; refuse plus de 2000 caracteres. Le contenu peut etre vide (pieces jointes). */
export function parseMessageContent(content: unknown): { content: string } {
  if (typeof content !== 'string') throw new InvalidInputError('Expected string');
  const trimmed = content.trim();
  if (trimmed.length > MESSAGE_MAX_LENGTH) throw new InvalidInputError(`Message too long (max ${MESSAGE_MAX_LENGTH} characters)`);
  return { content: trimmed };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUuid(value: unknown, message = 'Invalid ID'): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new InvalidInputError(message);
  return value;
}
