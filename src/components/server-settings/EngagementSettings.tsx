import { Heart, MessageSquare, Users, TrendingUp } from 'lucide-react';

interface EngagementSettingsProps {
  serverId: string;
}

export function EngagementSettings({ serverId }: EngagementSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Engagement des membres</h3>
        <p className="text-sm text-muted-foreground">
          Suivez et améliorez l'engagement de votre communauté
        </p>
      </div>

      {/* Placeholder stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Membres actifs</span>
          </div>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">Messages</span>
          </div>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Heart className="w-4 h-4" />
            <span className="text-sm">Réactions</span>
          </div>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Cette semaine</p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Croissance</span>
          </div>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Ce mois</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border text-center">
        <p className="text-sm text-muted-foreground">
          Les statistiques d'engagement seront disponibles prochainement
        </p>
      </div>
    </div>
  );
}
