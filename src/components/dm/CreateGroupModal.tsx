import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Check, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFriends } from '@/hooks/useFriends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CreateGroupModalProps {
  onClose: () => void;
  onOpenDM: (conversationId: string) => void;
}

export function CreateGroupModal({ onClose, onOpenDM }: CreateGroupModalProps) {
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { data: friends = [] } = useFriends();
  const { user } = useAuth();

  const acceptedFriends = friends
    .filter(f => f.status === 'accepted')
    .sort((a, b) => a.profile.display_name.localeCompare(b.profile.display_name));

  const filteredFriends = acceptedFriends.filter(f =>
    f.profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop();
    const path = `group-icons/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('avatars').upload(path, file);
    if (error) {
      toast.error("Erreur lors de l'upload de l'icône");
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    setGroupIcon(urlData.publicUrl);
  };

  const handleCreate = async () => {
    if (!user || selectedFriends.length === 0) return;
    if (!groupName.trim()) {
      toast.error('Veuillez donner un nom au groupe');
      return;
    }

    setIsCreating(true);
    try {
      // Create group conversation
      const { data: conv, error: convError } = await supabase
        .from('dm_conversations')
        .insert({
          is_group: true,
          name: groupName.trim(),
          icon_url: groupIcon,
        })
        .select()
        .single();

      if (convError || !conv) throw convError;

      // Add all participants (current user + selected friends)
      const participants = [user.id, ...selectedFriends].map(userId => ({
        conversation_id: conv.id,
        user_id: userId,
      }));

      const { error: partError } = await supabase
        .from('dm_participants')
        .insert(participants);

      if (partError) throw partError;

      toast.success('Groupe créé !');
      onOpenDM(conv.id);
      onClose();
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('Erreur lors de la création du groupe');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative mt-auto bg-[hsl(var(--surface-2))] rounded-t-3xl shadow-elevation-3 w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {step === 'details' && (
              <button onClick={() => setStep('select')} className="text-sm text-muted-foreground mr-1">←</button>
            )}
            <h2 className="font-semibold text-base">
              {step === 'select' ? 'Créer un groupe' : 'Détails du groupe'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {step === 'select' ? (
          <>
            {/* Search */}
            <div className="px-4 py-3">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un ami..."
                className="h-10 bg-input text-sm"
                autoFocus
              />
            </div>

            {/* Selected count */}
            {selectedFriends.length > 0 && (
              <div className="px-4 pb-2">
                <span className="text-xs text-muted-foreground">
                  {selectedFriends.length} sélectionné{selectedFriends.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Friend list with checkboxes */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {filteredFriends.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucun ami trouvé
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredFriends.map(friend => {
                    const isSelected = selectedFriends.includes(friend.profile.id);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleFriend(friend.profile.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                          isSelected ? 'bg-primary/10' : 'hover:bg-[hsl(var(--surface-3))]'
                        )}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={friend.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {friend.profile.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{friend.profile.display_name}</p>
                          <p className="text-xs text-muted-foreground truncate">@{friend.profile.username}</p>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Next button */}
            {selectedFriends.length > 0 && (
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={() => setStep('details')}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Suivant ({selectedFriends.length})
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Group details */}
            <div className="px-4 py-6 flex flex-col items-center gap-4">
              {/* Group icon */}
              <label className="relative cursor-pointer">
                <div className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center',
                  groupIcon ? '' : 'bg-muted border-2 border-dashed border-muted-foreground/30'
                )}>
                  {groupIcon ? (
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={groupIcon} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xl">G</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconUpload}
                />
              </label>

              {/* Group name */}
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nom du groupe"
                className="text-center h-12 text-base"
                autoFocus
              />

              {/* Selected members preview */}
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedFriends.map(id => {
                  const friend = acceptedFriends.find(f => f.profile.id === id);
                  if (!friend) return null;
                  return (
                    <div key={id} className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={friend.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                          {friend.profile.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{friend.profile.display_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create button */}
            <div className="px-4 py-3 border-t border-border mt-auto">
              <button
                onClick={handleCreate}
                disabled={isCreating || !groupName.trim()}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Création...' : 'Créer le groupe'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
