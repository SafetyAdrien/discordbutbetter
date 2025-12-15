import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ServerTemplatePageProps {
  serverId: string;
}

export function ServerTemplatePage({ serverId }: ServerTemplatePageProps) {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [templateCode, setTemplateCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return;
    
    setIsCreating(true);
    // Placeholder - would create template in database
    setTimeout(() => {
      setTemplateCode(`template_${Date.now()}`);
      setIsCreating(false);
      toast.success('Template créé avec succès');
    }, 1000);
  };

  const handleCopyCode = () => {
    if (templateCode) {
      navigator.clipboard.writeText(templateCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copié');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Template de serveur</h3>
        <p className="text-sm text-muted-foreground">
          Créez un template à partir de la structure de ce serveur pour le partager
        </p>
      </div>

      {templateCode ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCode className="w-5 h-5 text-primary" />
              Template créé
            </CardTitle>
            <CardDescription>
              Partagez ce code pour que d'autres puissent créer un serveur similaire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input value={templateCode} readOnly className="font-mono" />
              <Button variant="outline" size="icon" onClick={handleCopyCode}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button variant="outline" onClick={() => setTemplateCode(null)}>
              Créer un nouveau template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Créer un template</CardTitle>
            <CardDescription>
              Le template inclura les canaux, catégories et rôles du serveur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nom du template</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Mon template de serveur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-desc">Description (optionnel)</Label>
              <Textarea
                id="template-desc"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Décrivez votre template..."
                rows={3}
              />
            </div>
            <Button 
              onClick={handleCreateTemplate} 
              disabled={!templateName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <FileCode className="w-4 h-4 mr-2" />
                  Créer le template
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">Ce qui sera inclus</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Structure des catégories et canaux</li>
          <li>• Rôles et leurs permissions</li>
          <li>• Paramètres du serveur</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-3">
          <strong>Non inclus :</strong> Messages, membres, emojis personnalisés
        </p>
      </div>
    </div>
  );
}
