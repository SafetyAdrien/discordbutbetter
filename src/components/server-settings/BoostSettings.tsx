import { Zap, Gift, Sparkles, Image, Volume2, Upload, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface BoostSettingsProps {
  serverId: string;
}

const boostLevels = [
  {
    level: 0,
    boosts: 0,
    perks: [
      { icon: Image, label: 'Icône du serveur animée', enabled: false },
      { icon: Sparkles, label: '50 emplacements emoji', enabled: true },
      { icon: Volume2, label: 'Qualité audio 96 kbps', enabled: true }
    ]
  },
  {
    level: 1,
    boosts: 2,
    perks: [
      { icon: Image, label: 'Icône du serveur animée', enabled: true },
      { icon: Sparkles, label: '100 emplacements emoji', enabled: true },
      { icon: Volume2, label: 'Qualité audio 128 kbps', enabled: true },
      { icon: Upload, label: 'Limite upload 8 Mo → 25 Mo', enabled: true }
    ]
  },
  {
    level: 2,
    boosts: 7,
    perks: [
      { icon: Image, label: 'Bannière du serveur', enabled: true },
      { icon: Sparkles, label: '150 emplacements emoji', enabled: true },
      { icon: Volume2, label: 'Qualité audio 256 kbps', enabled: true },
      { icon: Upload, label: 'Limite upload 50 Mo', enabled: true },
      { icon: Video, label: 'Streaming 1080p 60fps', enabled: true }
    ]
  },
  {
    level: 3,
    boosts: 14,
    perks: [
      { icon: Image, label: 'Bannière animée', enabled: true },
      { icon: Sparkles, label: '250 emplacements emoji', enabled: true },
      { icon: Volume2, label: 'Qualité audio 384 kbps', enabled: true },
      { icon: Upload, label: 'Limite upload 100 Mo', enabled: true },
      { icon: Gift, label: 'URL personnalisée', enabled: true }
    ]
  }
];

export function BoostSettings({ serverId }: BoostSettingsProps) {
  // Mock data - in production, fetch from server
  const currentBoosts = 0;
  const currentLevel = 0;
  const nextLevel = boostLevels.find(l => l.boosts > currentBoosts);
  const boostsForNext = nextLevel ? nextLevel.boosts - currentBoosts : 0;
  const progressPercent = nextLevel ? (currentBoosts / nextLevel.boosts) * 100 : 100;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Avantages Boost</h3>
        <p className="text-sm text-muted-foreground">
          Boostez votre serveur pour débloquer des fonctionnalités exclusives
        </p>
      </div>

      {/* Current Status */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-purple-400" />
            Niveau actuel : {currentLevel}
          </CardTitle>
          <CardDescription>
            {currentBoosts} boost{currentBoosts > 1 ? 's' : ''} actif{currentBoosts > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Prochain niveau</span>
                <span className="text-muted-foreground">
                  {boostsForNext} boost{boostsForNext > 1 ? 's' : ''} restant{boostsForNext > 1 ? 's' : ''}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level Perks */}
      <div className="grid gap-4">
        {boostLevels.map((level) => {
          const isCurrentLevel = level.level === currentLevel;
          const isUnlocked = level.level <= currentLevel;
          
          return (
            <Card 
              key={level.level}
              className={`transition-all ${isCurrentLevel ? 'ring-2 ring-purple-500' : ''} ${!isUnlocked ? 'opacity-50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className={`w-4 h-4 ${isUnlocked ? 'text-purple-400' : 'text-muted-foreground'}`} />
                    Niveau {level.level}
                  </CardTitle>
                  <Badge variant={isUnlocked ? 'default' : 'secondary'}>
                    {level.boosts} boost{level.boosts > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {level.perks.map((perk, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <perk.icon className={`w-4 h-4 ${isUnlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={isUnlocked ? '' : 'text-muted-foreground'}>{perk.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Les boosts sont achetés individuellement par les membres du serveur. 
            Chaque boost dure 30 jours et peut être annulé à tout moment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
