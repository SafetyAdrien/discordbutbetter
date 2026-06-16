import { useState } from 'react';
import { Eye, MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MarkdownText } from '@/lib/markdown';
import { AnnouncementReactions } from './AnnouncementReactions';
import { AnnouncementComments } from './AnnouncementComments';
import { CreateAnnouncementModal } from './CreateAnnouncementModal';
import {
  useAnnouncementComments,
  useAddAnnouncementComment,
  useDeleteAnnouncementComment,
  useAnnouncementReactions,
  useToggleAnnouncementReaction,
  useDeleteAnnouncement,
  type Announcement,
  type AnnouncementCategory,
} from '@/hooks/useAnnouncements';
import { useAuth } from '@/contexts/AuthContext';

interface AnnouncementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement;
  canEdit?: boolean;
  categories: AnnouncementCategory[];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AnnouncementDetailModal({
  open,
  onOpenChange,
  announcement,
  canEdit = false,
  categories,
}: AnnouncementDetailModalProps) {
  const { user } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: comments = [] } = useAnnouncementComments(announcement.id);
  const { data: reactions = [] } = useAnnouncementReactions(announcement.id);

  const addComment = useAddAnnouncementComment();
  const deleteComment = useDeleteAnnouncementComment();
  const toggleReaction = useToggleAnnouncementReaction();
  const deleteAnnouncement = useDeleteAnnouncement();

  const handleAddComment = (content: string, replyToId?: string | null) => {
    addComment.mutate({ announcementId: announcement.id, content, replyToId });
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment.mutate({ id: commentId, announcementId: announcement.id });
  };

  const handleToggleReaction = (emoji: string) => {
    toggleReaction.mutate({ announcementId: announcement.id, emoji });
  };

  const handleDelete = () => {
    deleteAnnouncement.mutate(
      { id: announcement.id, channelId: announcement.channel_id },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const isAuthor = announcement.author.id === user?.id;
  const showActions = canEdit || isAuthor;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          {/* Banner */}
          {announcement.banner_url && (
            <div className="relative h-48 flex-shrink-0">
              <img
                src={announcement.banner_url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>
          )}

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  {announcement.category && (
                    <Badge
                      style={{
                        backgroundColor: `${announcement.category.color}20`,
                        color: announcement.category.color,
                        borderColor: `${announcement.category.color}40`,
                      }}
                    >
                      {announcement.category.icon} {announcement.category.name}
                    </Badge>
                  )}
                  <h1 className="text-2xl font-bold font-ginto">{announcement.title}</h1>
                </div>

                {showActions && (
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                          <Pencil className="w-4 h-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer l'annonce ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. L'annonce et tous ses commentaires seront supprimés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Author + date */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <Avatar>
                  <AvatarImage src={announcement.author.avatar_url || undefined} />
                  <AvatarFallback>{announcement.author.display_name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{announcement.author.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Publié le {formatDate(announcement.created_at)}
                    {announcement.edited_at && <span className="text-[.625rem] text-muted-foreground/40 ml-1">(modifié)</span>}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2 text-muted-foreground text-sm">
                  <Eye className="w-4 h-4" />
                  {announcement.view_count} vues
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-invert max-w-none mb-8">
                <MarkdownText variant="chat" content={announcement.content} />
              </div>

              {/* Reactions */}
              <AnnouncementReactions
                reactions={reactions}
                onToggleReaction={handleToggleReaction}
              />

              {/* Comments section */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Commentaires ({comments.length})
                </h3>

                <AnnouncementComments
                  comments={comments}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <CreateAnnouncementModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            // Optionally close detail modal after edit
          }
        }}
        channelId={announcement.channel_id}
        categories={categories}
        announcement={announcement}
      />
    </>
  );
}
