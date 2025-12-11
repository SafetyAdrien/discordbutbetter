import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Plus } from 'lucide-react';

const availableConnections = [
  { 
    id: 'twitch', 
    name: 'Twitch', 
    icon: '🎮',
    color: 'bg-purple-600',
    description: 'Afficher votre statut de streaming' 
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    icon: '📺',
    color: 'bg-red-600',
    description: 'Partager vos vidéos et streams' 
  },
  { 
    id: 'github', 
    name: 'GitHub', 
    icon: '🐙',
    color: 'bg-gray-800',
    description: 'Afficher vos contributions' 
  },
  { 
    id: 'twitter', 
    name: 'X (Twitter)', 
    icon: '🐦',
    color: 'bg-sky-500',
    description: 'Partager votre profil social' 
  },
  { 
    id: 'spotify', 
    name: 'Spotify', 
    icon: '🎵',
    color: 'bg-green-600',
    description: 'Afficher ce que vous écoutez' 
  },
  { 
    id: 'steam', 
    name: 'Steam', 
    icon: '🎲',
    color: 'bg-slate-700',
    description: 'Afficher votre bibliothèque de jeux' 
  },
];

export function ConnectionsSettings() {
  return (
    <div className="space-y-6">
      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Comptes connectés
          </CardTitle>
          <CardDescription>
            Aucun compte connecté pour le moment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-4">
              Connectez vos comptes pour enrichir votre profil
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connexions disponibles</CardTitle>
          <CardDescription>
            Liez vos comptes pour afficher votre activité sur votre profil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {availableConnections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${connection.color} flex items-center justify-center text-xl`}>
                    {connection.icon}
                  </div>
                  <div>
                    <p className="font-medium">{connection.name}</p>
                    <p className="text-sm text-muted-foreground">{connection.description}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2" disabled>
                  <Plus className="w-4 h-4" />
                  Connecter
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Les connexions externes seront disponibles prochainement
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
