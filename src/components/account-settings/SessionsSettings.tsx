import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, LogOut, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function SessionsSettings() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoutAllDevices = () => {
    setIsLoading(true);
    // Simulated action
    setTimeout(() => {
      toast.info('Déconnexion de tous les appareils sera disponible prochainement');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Current Session */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Session actuelle
          </CardTitle>
          <CardDescription>Votre appareil actuel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Navigateur Web</p>
                <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                  Actuel
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Session locale
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Maintenant
                </span>
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Other Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Autres sessions
          </CardTitle>
          <CardDescription>
            Appareils connectés à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-4">
              Aucune autre session active détectée
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions de sécurité</CardTitle>
          <CardDescription>
            Gérez la sécurité de vos sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium">Déconnecter tous les autres appareils</p>
              <p className="text-sm text-muted-foreground">
                Ferme toutes les sessions sauf celle-ci
              </p>
            </div>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleLogoutAllDevices}
              disabled={isLoading}
            >
              <LogOut className="w-4 h-4" />
              Déconnecter
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Si vous suspectez une activité non autorisée sur votre compte, nous vous recommandons de changer votre mot de passe et de déconnecter tous les appareils.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
