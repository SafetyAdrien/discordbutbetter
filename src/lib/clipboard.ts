import { toast } from 'sonner';

export async function copyToClipboard(text: string, label?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copié !', { description: label || 'Copié dans le presse-papiers' });
    return true;
  } catch (err) {
    toast.error('Erreur', { description: 'Impossible de copier dans le presse-papiers' });
    return false;
  }
}
