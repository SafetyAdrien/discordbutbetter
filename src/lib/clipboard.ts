import { toast } from '@/hooks/use-toast';

export async function copyToClipboard(text: string, label?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copié !',
      description: label || 'Copié dans le presse-papiers',
    });
    return true;
  } catch (err) {
    toast({
      title: 'Erreur',
      description: 'Impossible de copier dans le presse-papiers',
      variant: 'destructive',
    });
    return false;
  }
}
