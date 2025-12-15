import { useState } from 'react';
import { Copy, Download, Upload, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ServerTemplateManagerProps {
  serverId: string;
}

export function ServerTemplateManager({ serverId }: ServerTemplateManagerProps) {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [existingTemplate, setExistingTemplate] = useState<{
    id: string;
    name: string;
    code: string;
    uses: number;
    createdAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Veuillez entrer un nom pour le template');
      return;
    }
    
    // TODO: Implement template creation
    toast.success('Template créé avec succès');
    setExistingTemplate({
      id: '1',
      name: templateName,
      code: 'ABC123XYZ',
      uses: 0,
      createdAt: new Date().toISOString()
    });
  };

  const handleCopyCode = () => {
    if (!existingTemplate) return;
    navigator.clipboard.writeText(`https://discord.new/${existingTemplate.code}`);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncTemplate = () => {
    toast.info('Synchronisation du template...');
    setTimeout(() => {
      toast.success('Template synchronisé');
    }, 1000);
  };

  const handleDeleteTemplate = () => {
    setExistingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    toast.success('Template supprimé');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Template de serveur</h3>
        <p className="text-sm text-muted-foreground">
          Créez un template pour permettre à d'autres de créer un serveur basé sur le vôtre
        </p>
      </div>

      {existingTemplate ? (
        <div className="space-y-4">
          {/* Existing Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="w-5 h-5" />
                {existingTemplate.name}
              </CardTitle>
              <CardDescription>
                Créé le {new Date(existingTemplate.createdAt).toLocaleDateString('fr-FR')} • 
                {existingTemplate.uses} utilisation{existingTemplate.uses > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Link */}
              <div className="space-y-2">
                <Label>Lien du template</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`https://discord.new/${existingTemplate.code}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={handleCopyCode}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSyncTemplate}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Synchroniser
                </Button>
                <Button variant="destructive" onClick={handleDeleteTemplate}>
                  Supprimer le template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* What's Included */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium mb-2">Éléments inclus dans le template</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Catégories et salons</li>
                <li>✓ Rôles et permissions</li>
                <li>✓ Paramètres du serveur</li>
                <li className="text-muted-foreground/50">✗ Messages et historique</li>
                <li className="text-muted-foreground/50">✗ Membres</li>
                <li className="text-muted-foreground/50">✗ Emojis et stickers personnalisés</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Create Template Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Créer un template</CardTitle>
              <CardDescription>
                Partagez la structure de votre serveur avec la communauté
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nom du template *</Label>
                <Input
                  id="template-name"
                  placeholder="Ex: Serveur Gaming"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description (optionnel)</Label>
                <Textarea
                  id="template-description"
                  placeholder="Décrivez votre template..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="resize-none"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {templateDescription.length}/300
                </p>
              </div>

              <Button onClick={handleCreateTemplate} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Générer le template
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium mb-2">Bon à savoir</h4>
              <p className="text-sm text-muted-foreground">
                Les templates permettent à d'autres utilisateurs de créer rapidement un serveur 
                avec la même structure que le vôtre. Seule la structure est copiée, pas le contenu.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
