import { Sparkles, Zap, Volume2, Upload, Smile } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BoostBenefitsPageProps {
  serverId: string;
}

export function BoostBenefitsPage({ serverId }: BoostBenefitsPageProps) {
  // Mock data - would be fetched from server
  const boostLevel = 0;
  const boostCount = 0;
  const nextLevelBoosts = 2;

  const benefits = [
    {
      level: 1,
      unlocks: [
        { icon: Smile, text: '+50 emplacements d\'emojis (pour 100 au total)' },
        { icon: Volume2, text: 'Qualité audio améliorée (128 kbps)' },
        { icon: Upload, text: 'Limite de téléchargement : 8 Mo → 25 Mo' },
      ]
    },
    {
      level: 2,
      unlocks: [
        { icon: Smile, text: '+50 emplacements d\'emojis (pour 150 au total)' },
        { icon: Volume2, text: 'Qualité audio améliorée (256 kbps)' },
        { icon: Upload, text: 'Limite de téléchargement : 50 Mo' },
      ]
    },
    {
      level: 3,
      unlocks: [
        { icon: Smile, text: '+100 emplacements d\'emojis (pour 250 au total)' },
        { icon: Volume2, text: 'Qualité audio maximale (384 kbps)' },
        { icon: Upload, text: 'Limite de téléchargement : 100 Mo' },
        { icon: Sparkles, text: 'Bannière de serveur animée' },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Avantages Boost</h3>
        <p className="text-sm text-muted-foreground">
          Débloquez des fonctionnalités exclusives en boostant ce serveur
        </p>
      </div>

      {/* Current Level */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-[#f47fff]" />
            Niveau actuel : {boostLevel}
          </CardTitle>
          <CardDescription>
            {boostCount} boost{Number(boostCount) !== 1 ? 's' : ''} sur ce serveur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression vers le niveau {boostLevel + 1}</span>
              <span>{boostCount}/{nextLevelBoosts} boosts</span>
            </div>
            <Progress value={(boostCount / nextLevelBoosts) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Benefits by Level */}
      <div className="space-y-4">
        {benefits.map((tier) => (
          <Card 
            key={tier.level} 
            className={boostLevel >= tier.level ? 'border-[#f47fff]/50 bg-[#f47fff]/5' : ''}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  boostLevel >= tier.level ? 'bg-[#f47fff] text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {tier.level}
                </div>
                Niveau {tier.level}
                {boostLevel >= tier.level && (
                  <span className="text-xs text-[#f47fff] font-normal">Débloqué</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tier.unlocks.map((unlock, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <unlock.icon className={`w-4 h-4 ${
                      boostLevel >= tier.level ? 'text-[#f47fff]' : 'text-muted-foreground'
                    }`} />
                    <span className={boostLevel >= tier.level ? '' : 'text-muted-foreground'}>
                      {unlock.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
