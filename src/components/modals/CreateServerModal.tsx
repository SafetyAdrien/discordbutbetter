import { useState } from 'react';
import { X, Upload, Camera, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (name: string, icon: string) => void;
}

const defaultIcons = ['🎮', '🏆', '🎨', '🎵', '💻', '🚀', '⚔️', '🌟', '🔥', '💜', '🎯', '🎪'];

export function CreateServerModal({ onClose, onCreate }: CreateServerModalProps) {
  const [serverName, setServerName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🎮');
  const [step, setStep] = useState<'type' | 'customize'>('type');

  const handleCreate = () => {
    if (serverName.trim()) {
      onCreate(serverName, selectedIcon);
      onClose();
    }
  };

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
          
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-gaming flex items-center justify-center animation-float">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <h2 className="text-2xl font-display font-bold glow-text">
            Créer un serveur
          </h2>
          <p className="text-muted-foreground mt-2">
            Votre serveur est l'endroit où vous et vos amis traînez. Créez le vôtre et commencez à discuter.
          </p>
        </div>

        {step === 'type' ? (
          /* Step 1: Choose Type */
          <div className="px-6 pb-6 space-y-3">
            <button
              onClick={() => setStep('customize')}
              className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🎮</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    Créer le mien
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Personnalisez votre serveur comme vous le souhaitez
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('customize')}
              className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🏆</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    Gaming
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Modèle optimisé pour les communautés de jeux
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('customize')}
              className="w-full p-4 bg-surface-elevated rounded-lg border border-border hover:border-primary/50 hover:bg-surface-hover transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    Amis
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Un espace pour vous et votre groupe d'amis
                  </p>
                </div>
              </div>
            </button>
          </div>
        ) : (
          /* Step 2: Customize */
          <div className="px-6 pb-6">
            {/* Icon Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                Icône du serveur
              </label>
              
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
              <label className="block text-sm font-medium text-foreground mb-2">
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
                onClick={() => setStep('type')}
              >
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
