import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useJoinByInvite } from '@/hooks/useInvites';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InviteDetails {
  id: string;
  code: string;
  server: {
    id: string;
    name: string;
    icon_url: string | null;
    description: string | null;
    member_count: number;
  };
  is_expired: boolean;
  is_max_uses: boolean;
}

const Invite = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const joinByInvite = useJoinByInvite();
  
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!code) {
        setError('Code d\'invitation invalide');
        setLoading(false);
        return;
      }

      try {
        // Fetch invite with server details
        const { data: inviteData, error: inviteError } = await supabase
          .from('invites')
          .select(`
            id,
            code,
            expires_at,
            max_uses,
            uses,
            server:server_id (
              id,
              name,
              icon_url,
              description
            )
          `)
          .eq('code', code)
          .single();

        if (inviteError || !inviteData) {
          setError('Cette invitation n\'existe pas ou a expiré');
          setLoading(false);
          return;
        }

        // Check expiration
        const isExpired = inviteData.expires_at && new Date(inviteData.expires_at) < new Date();
        const isMaxUses = inviteData.max_uses && (inviteData.uses ?? 0) >= inviteData.max_uses;

        // Get member count
        const { count } = await supabase
          .from('server_members')
          .select('*', { count: 'exact', head: true })
          .eq('server_id', (inviteData.server as any).id);

        // Check if already a member
        if (user) {
          const { data: membership } = await supabase
            .from('server_members')
            .select('id')
            .eq('server_id', (inviteData.server as any).id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          setAlreadyMember(!!membership);
        }

        setInvite({
          id: inviteData.id,
          code: inviteData.code,
          server: {
            id: (inviteData.server as any).id,
            name: (inviteData.server as any).name,
            icon_url: (inviteData.server as any).icon_url,
            description: (inviteData.server as any).description,
            member_count: count || 0,
          },
          is_expired: !!isExpired,
          is_max_uses: !!isMaxUses,
        });
      } catch (err) {
        setError('Erreur lors du chargement de l\'invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [code, user]);

  const handleJoin = async () => {
    if (!code) return;
    
    joinByInvite.mutate(code, {
      onSuccess: (serverId) => {
        navigate('/');
      },
    });
  };

  const handleGoToServer = () => {
    navigate('/');
  };

  // Show loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Connexion requise</h2>
            <p className="text-muted-foreground">
              Vous devez être connecté pour rejoindre un serveur.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error
  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Invitation invalide</h2>
            <p className="text-muted-foreground">
              {error || 'Cette invitation n\'existe pas ou a expiré.'}
            </p>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show expired/max uses
  if (invite.is_expired || invite.is_max_uses) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Invitation expirée</h2>
            <p className="text-muted-foreground">
              {invite.is_expired 
                ? 'Cette invitation a expiré.' 
                : 'Cette invitation a atteint le nombre maximum d\'utilisations.'}
            </p>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Header with gradient */}
        <div className="h-20 bg-gradient-to-r from-primary to-primary/50" />
        
        <CardContent className="pt-0 -mt-10 text-center space-y-4">
          {/* Server Icon */}
          <Avatar className="w-20 h-20 mx-auto border-4 border-card">
            <AvatarImage src={invite.server.icon_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
              {invite.server.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Server Info */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Vous avez été invité à rejoindre</p>
            <h2 className="text-2xl font-bold">{invite.server.name}</h2>
            {invite.server.description && (
              <p className="text-muted-foreground text-sm">{invite.server.description}</p>
            )}
          </div>

          {/* Member Count */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">{invite.server.member_count} membres</span>
          </div>

          {/* Action Button */}
          {alreadyMember ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-[hsl(var(--online))]">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Vous êtes déjà membre de ce serveur</span>
              </div>
              <Button onClick={handleGoToServer} className="w-full">
                Aller au serveur
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleJoin} 
              className="w-full"
              disabled={joinByInvite.isPending}
            >
              {joinByInvite.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejoindre...
                </>
              ) : (
                'Accepter l\'invitation'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invite;
