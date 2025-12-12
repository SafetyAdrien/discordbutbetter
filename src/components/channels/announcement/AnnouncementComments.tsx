import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownText } from '@/lib/markdown';
import { useAuth } from '@/contexts/AuthContext';
import type { AnnouncementComment } from '@/hooks/useAnnouncements';

interface AnnouncementCommentsProps {
  comments: AnnouncementComment[];
  onAddComment: (content: string) => void;
  onDeleteComment: (commentId: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR');
}

export function AnnouncementComments({ comments, onAddComment, onDeleteComment }: AnnouncementCommentsProps) {
  const { user, profile } = useAuth();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* New comment input */}
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback>{profile?.display_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Ajouter un commentaire..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <Button onClick={handleSubmit} disabled={!newComment.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 group">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={comment.author.avatar_url || undefined} />
              <AvatarFallback>{comment.author.display_name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.author.display_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(comment.created_at)}
                </span>
                {comment.author.id === user?.id && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
              <div className="text-sm mt-1">
                <MarkdownText content={comment.content} />
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun commentaire pour le moment
          </p>
        )}
      </div>
    </div>
  );
}
