import { useState } from 'react';
import { X, Camera, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { JoinServerModal } from './JoinServerModal';

interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (name: string, icon: string) => void;
  onDiscoverClick?: () => void;
}

const defaultIcons = ['🎮', '🏆', '🎨', '🎵', '💻', '🚀', '⚔️', '🌟', '🔥', '💜', '🎯', '🎪'];

const templates = [
  { id: 'gaming', name: 'Gaming', icon: '🎮', description: 'Pour les communautés de joueurs' },
  { id: 'friends', name: 'Amis', icon: '💗', description: 'Un espace pour votre groupe d\'amis' },
  { id: 'study', name: 'Groupe d\'étude', icon: '🍎', description: 'Pour les projets éducatifs' },
  { id: 'school', name: 'Club Scolaire', icon: '📚', description: 'Pour les associations étudiantes' },
];

export function CreateServerModal({ onClose, onCreate, onDiscoverClick }: CreateServerModalProps) {
  const [serverName, setServerName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🎮');
  const [step, setStep] = useState<'choice' | 'type' | 'customize' | 'join'>('choice');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleCreate = () => {
    if (serverName.trim()) {
      onCreate(serverName, selectedIcon);
      onClose();
    }
  };

  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSelectedIcon(template.icon);
      }
    }
    setStep('customize');
  };

  const handleJoinSuccess = (serverId: string) => {
    onClose();
  };

  // Show Join Server Modal
  if (step === 'join') {
    return (
      <JoinServerModal
        onClose={onClose}
        onBack={() => setStep('choice')}
        onJoinSuccess={handleJoinSuccess}
        onDiscoverClick={onDiscoverClick}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-2xl overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="p-6 text-center relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute right-4 top-4"
          >
            <X className="w-5 h-5" />
          </Button>
          
          {step === 'choice' && (
            <>
              <h2 className="text-2xl font-display font-bold">
                Créer un serveur
              </h2>
              <p className="text-muted-foreground mt-2">
                Votre serveur est l'endroit où vous et vos amis traînez. Créez le vôtre et commencez à discuter.
              </p>
            </>
          )}

          {step === 'type' && (
            <>
              <h2 className="text-2xl font-display font-bold">
                Créer votre serveur
              </h2>
              <p className="text-muted-foreground mt-2">
                Votre serveur est l'endroit où vous et vos amis passez du temps. Créez le vôtre et commencez à discuter.
              </p>
            </>
          )}

          {step === 'customize' && (
            <>
              <h2 className="text-2xl font-display font-bold">
                Personnaliser votre serveur
              </h2>
              <p className="text-muted-foreground mt-2">
                Donnez une identité à votre nouveau serveur en lui donnant un nom et une icône. Vous pourrez toujours les modifier plus tard.
              </p>
            </>
          )}
        </div>

        {step === 'choice' && (
          <div className="px-6 pb-6 space-y-3">
            {/* Create own server */}
            <button
              onClick={() => setStep('type')}
              className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Créer le mien
                    </h3>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>

            {/* Join existing server link */}
            <div className="pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Vous avez déjà une invitation ?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep('join')}
              >
                Rejoindre un serveur
              </Button>
            </div>
          </div>
        )}

        {step === 'type' && (
          <div className="px-6 pb-6 space-y-4">
            {/* Create own - top option */}
            <button
              onClick={() => handleSelectTemplate(null)}
              className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Créer le mien
                    </h3>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>

            {/* Template section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Commencer à partir d'un modèle
              </p>
              
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className="w-full p-3 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{template.icon}</span>
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            {/* Back button */}
            <div className="pt-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('choice')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </div>
          </div>
        )}

        {step === 'customize' && (
          <div className="px-6 pb-6">
            {/* Icon Selection */}
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                <div className="relative group cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-gradient-gaming flex items-center justify-center text-4xl shadow-lg glow-border group-hover:scale-105 transition-transform">
                    {selectedIcon}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-6 h-6 text-foreground" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {defaultIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all',
                      selectedIcon === icon
                        ? 'bg-primary/20 border-2 border-primary scale-110'
                        : 'bg-surface-elevated hover:bg-surface-hover border border-transparent'
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Server Name */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Nom du serveur
              </label>
              <Input
                placeholder="Mon super serveur"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                En créant un serveur, vous acceptez les Conditions d'utilisation.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setStep(selectedTemplate ? 'type' : 'choice')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button
                variant="gaming"
                className="flex-1"
                onClick={handleCreate}
                disabled={!serverName.trim()}
              >
                Créer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
