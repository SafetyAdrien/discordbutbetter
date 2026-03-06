import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useMutualServers } from '@/hooks/useMutualServers';
import { useMutualFriends } from '@/hooks/useMutualFriends';
import { useCreateDMConversation, useDMConversations } from '@/hooks/useDMs';
import { useFriends, useSendFriendRequest, useRemoveFriend } from '@/hooks/useFriends';
import { useUserNote, useSaveUserNote } from '@/hooks/useUserNotes';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageCircle, UserPlus, UserMinus, Check, X } from 'lucide-react';
import { parseMarkdown, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
};

export interface FullProfileUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  status: string;
  created_at?: string | null;
}

interface FullUserProfileModalProps {
  user: FullProfileUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToDM?: (conversationId: string) => void;
  initialTab?: 'about' | 'servers' | 'friends';
}

export function FullUserProfileModal({ 
  user, 
  open, 
  onOpenChange,
  onNavigateToDM,
  initialTab = 'about'
}: FullUserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'servers' | 'friends'>(initialTab);
  const [noteInput, setNoteInput] = useState('');
  
  const { user: currentUser } = useAuth();
  const { data: mutualServers = [] } = useMutualServers(user?.id || null);
  const { data: mutualFriends = [] } = useMutualFriends(user?.id || null);
  const { data: conversations = [] } = useDMConversations();
  const createDM = useCreateDMConversation();
  const { data: friends = [] } = useFriends();
  const sendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const { data: userNote } = useUserNote(user?.id || null);
  const { saveWithDebounce } = useSaveUserNote();

  // Sync note input with fetched note
  useEffect(() => {
    if (userNote?.content !== undefined) {
      setNoteInput(userNote.content);
    } else {
      setNoteInput('');
    }
  }, [userNote?.content, user?.id]);

  // Reset tab when modal opens with initialTab
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const handleNoteChange = (value: string) => {
    setNoteInput(value);
    if (user?.id) {
      saveWithDebounce(user.id, value);
    }
  };

  const isOwnProfile = currentUser?.id === user?.id;
  
  const friendship = friends.find(f => 
    (f.user_id === currentUser?.id && f.friend_id === user?.id) ||
    (f.friend_id === currentUser?.id && f.user_id === user?.id)
  );
  const isFriend = friendship?.status === 'accepted';
  const isPending = friendship?.status === 'pending';

  const memberSince = user?.created_at 
    ? format(new Date(user.created_at), 'd MMMM yyyy', { locale: fr })
    : null;

  const handleSendMessage = async () => {
    if (!user) return;
    
    // Check if DM already exists
    const existingConv = conversations.find(c => 
      c.participants.some(p => p.id === user.id)
    );

    if (existingConv) {
      onNavigateToDM?.(existingConv.id);
      onOpenChange(false);
      return;
    }

    try {
      const result = await createDM.mutateAsync(user.id);
      onNavigateToDM?.(result.conversation_id);
      onOpenChange(false);
    } catch (error) {
      toast.error("Impossible de créer la conversation");
    }
  };

  const handleFriendAction = () => {
    if (!user) return;
    
    if (isFriend && friendship) {
      removeFriend.mutate(friendship.id);
    } else if (!friendship) {
      sendRequest.mutate(user.username);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0 gap-0 overflow-hidden">
        {/* Banner */}
        <div 
          className="h-[120px] relative"
          style={{
            backgroundColor: user.banner_url ? undefined : 'hsl(var(--primary))',
            backgroundImage: user.banner_url ? `url(${user.banner_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Avatar & Actions */}
        <div className="px-4 flex items-end justify-between -mt-[50px] relative z-10">
          <div className="relative">
            <Avatar className="w-[94px] h-[94px] border-[6px] border-background">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                {user.display_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-background",
              statusColors[user.status || 'offline']
            )} />
          </div>

          {!isOwnProfile && (
            <div className="flex gap-2 mb-2">
              <Button 
                size="sm" 
                onClick={handleSendMessage}
                disabled={createDM.isPending}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Message
              </Button>
              <Button 
                size="sm" 
                variant={isFriend ? "destructive" : isPending ? "secondary" : "outline"}
                onClick={handleFriendAction}
                disabled={isPending}
              >
                {isFriend ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-1" />
                    Retirer
                  </>
                ) : isPending ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    En attente
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Ajouter
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="px-4 pt-3">
          <h2 className="text-xl font-bold">{user.display_name}</h2>
          <p className="text-sm text-muted-foreground">@{user.username.toLowerCase()}</p>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-4">
              <TabsTrigger 
                value="about" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-0"
              >
                À propos
              </TabsTrigger>
              <TabsTrigger 
                value="servers" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-0"
              >
                {mutualServers.length} Serveur{mutualServers.length !== 1 ? 's' : ''} en commun
              </TabsTrigger>
              {mutualFriends.length > 0 && (
                <TabsTrigger 
                  value="friends" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-0"
                >
                  Amis en commun
                </TabsTrigger>
              )}
            </TabsList>

            <ScrollArea className="h-[200px] mt-4">
              <TabsContent value="about" className="mt-0 space-y-4">
                {/* Bio */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    À Propos de Moi
                  </h4>
                  {user.bio ? (
                    <div className="text-sm markdown-preview prose prose-invert prose-sm max-w-none">
                      {(() => {
                        const prevCtx = getMarkdownContext();
                        setMarkdownContext({ ...prevCtx, variant: 'bio' });
                        const result = parseMarkdown(user.bio);
                        setMarkdownContext(prevCtx);
                        return result;
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune biographie définie.</p>
                  )}
                </div>

                {/* Member Since */}
                {memberSince && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Membre Discord depuis
                    </h4>
                    <p className="text-sm">{memberSince}</p>
                  </div>
                )}

                {/* Note Section */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Note
                  </h4>
                  <Textarea
                    value={noteInput}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="Cliquez pour ajouter une note"
                    className="min-h-[60px] resize-none text-sm bg-muted/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Visible que par vous • Sauvegarde automatique
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="servers" className="mt-0">
                {mutualServers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Aucun serveur en commun
                  </p>
                ) : (
                  <div className="space-y-1">
                    {mutualServers.map(server => (
                      <div 
                        key={server.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={server.icon_url || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                            {server.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{server.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="friends" className="mt-0">
                {mutualFriends.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Aucun ami en commun
                  </p>
                ) : (
                  <div className="space-y-1">
                    {mutualFriends.map(friend => (
                      <div 
                        key={friend.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                              {friend.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                            statusColors[friend.status || 'offline']
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{friend.display_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{friend.username.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Bottom padding */}
        <div className="h-4" />
      </DialogContent>
    </Dialog>
  );
}
