import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppWindow, ShieldAlert } from 'lucide-react';

export function AuthorizedAppsSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AppWindow className="w-5 h-5" />
            Applications autorisées
          </CardTitle>
          <CardDescription>
            Gérez les applications ayant accès à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Aucune application autorisée</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Lorsque vous autorisez des applications tierces à accéder à votre compte, elles apparaîtront ici. Vous pourrez révoquer leur accès à tout moment.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">À propos des autorisations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Les applications autorisées peuvent accéder à certaines informations de votre compte en fonction des permissions que vous leur accordez.
          </p>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Types d'accès courants :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Lire vos informations de profil</li>
              <li>Voir vos serveurs</li>
              <li>Voir vos connexions</li>
              <li>Rejoindre des serveurs en votre nom</li>
            </ul>
          </div>
          <p>
            Vérifiez toujours les permissions demandées avant d'autoriser une application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
