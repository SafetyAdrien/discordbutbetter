import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useJoinByInvite } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InviteDetails {
  id: string;
  server_id: string;
  server_name: string;
  server_icon_url: string | null;
  server_description: string | null;
  member_count: number;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  is_expired: boolean;
  is_maxed: boolean;
}

export default function Invite() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const joinByInvite = useJoinByInvite();
  
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      if (!code) {
        setError('Code d\'invitation manquant');
        setLoading(false);
        return;
      }

      try {
        // Use the secure RPC function to get invite details
        const { data, error: fetchError } = await supabase
          .rpc('get_invite_details', { invite_code: code });

        if (fetchError) throw fetchError;

        if (!data || data.length === 0) {
          setError('Invitation introuvable');
          setLoading(false);
          return;
        }

        const inviteData = data[0] as InviteDetails;

        // Check if invite is expired or maxed
        if (inviteData.is_expired) {
          setError('Cette invitation a expiré');
          setLoading(false);
          return;
        }

        if (inviteData.is_maxed) {
          setError('Cette invitation a atteint le nombre maximum d\'utilisations');
          setLoading(false);
          return;
        }

        setInvite(inviteData);

        // Check if user is already a member
        if (user) {
          const { data: memberData } = await supabase
            .from('server_members')
            .select('id')
            .eq('server_id', inviteData.server_id)
            .eq('user_id', user.id)
            .single();

          setIsAlreadyMember(!!memberData);
        }
      } catch (err) {
        console.error('Error fetching invite:', err);
        setError('Erreur lors du chargement de l\'invitation');
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [code, user]);

  const handleJoin = async () => {
    if (!code) return;
    
    joinByInvite.mutate(code, {
      onSuccess: () => {
        navigate('/');
      },
    });
  };

  const handleGoToServer = () => {
    navigate('/');
  };

  // Show loading
  if (loading) {
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
  if (invite.is_expired || invite.is_maxed) {
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
            <AvatarImage src={invite.server_icon_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
              {invite.server_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Server Info */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Vous avez été invité à rejoindre</p>
            <h2 className="text-2xl font-bold">{invite.server_name}</h2>
            {invite.server_description && (
              <p className="text-muted-foreground text-sm">{invite.server_description}</p>
            )}
          </div>

          {/* Member Count */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">{invite.member_count} membres</span>
          </div>

          {/* Action Button */}
          {isAlreadyMember ? (
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
}
