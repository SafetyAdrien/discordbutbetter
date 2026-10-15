import { toast } from 'sonner';

export async function copyToClipboard(text: string, label?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    toast.error('Erreur', { description: 'Impossible de copier dans le presse-papiers' });
    return false;
  }
}
