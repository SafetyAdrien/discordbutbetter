import { useState, useMemo } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { AnnouncementStats } from './announcement/AnnouncementStats';
import { AnnouncementFilters, DEFAULT_CATEGORIES, type AnnouncementCategory } from './announcement/AnnouncementFilters';
import { CategoryFilterModal } from './announcement/CategoryFilterModal';
import { FeaturedAnnouncement } from './announcement/FeaturedAnnouncement';
import { AnnouncementCard } from './announcement/AnnouncementCard';

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface AnnouncementChannelProps {
  channel: Channel;
  onToggleMembers?: () => void;
  showMembers?: boolean;
}

interface Announcement {
  id: string;
  title?: string;
  content: string;
  category?: AnnouncementCategory;
  bannerUrl?: string;
  thumbnailUrl?: string;
  author: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  createdAt: Date;
  pinned: boolean;
  featured?: boolean;
  reactions?: { emoji: string; count: number }[];
}

export function AnnouncementChannel({ channel, onToggleMembers, showMembers }: AnnouncementChannelProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<AnnouncementCategory[]>([]);

  // Mock announcements for demonstration
  const announcements: Announcement[] = [];

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  // Filter announcements
  const filteredAnnouncements = useMemo(() => {
    if (activeFilter === 'all') return announcements;
    return announcements.filter((a) => a.category?.id === activeFilter);
  }, [announcements, activeFilter]);

  // Get featured announcement (first pinned or most recent)
  const featuredAnnouncement = useMemo(() => {
    const pinned = filteredAnnouncements.find((a) => a.pinned || a.featured);
    return pinned || filteredAnnouncements[0];
  }, [filteredAnnouncements]);

  // Grid announcements (excluding featured)
  const gridAnnouncements = useMemo(() => {
    if (!featuredAnnouncement) return filteredAnnouncements;
    return filteredAnnouncements.filter((a) => a.id !== featuredAnnouncement.id);
  }, [filteredAnnouncements, featuredAnnouncement]);

  // Stats
  const thisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return announcements.filter((a) => a.createdAt > weekAgo).length;
  }, [announcements]);

  const handleAddCategory = (category: Omit<AnnouncementCategory, 'id'>) => {
    setCustomCategories((prev) => [
      ...prev,
      { ...category, id: `custom-${Date.now()}` },
    ]);
  };

  const handleDeleteCategory = (id: string) => {
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <StreamlineMegaphone className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground font-ginto">{channel.name}</h2>
        </div>

        <AnnouncementStats
          totalCount={announcements.length}
          thisWeekCount={thisWeekCount}
        />

        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nouvelle annonce
          </Button>
          {onToggleMembers && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMembers}
              className={showMembers ? 'bg-muted' : ''}
            >
              <Users className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AnnouncementFilters
        categories={allCategories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onManageCategories={() => setCategoryModalOpen(true)}
        canManage={true}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center mb-6">
              <StreamlineMegaphone size={48} className="text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Aucune annonce</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              Les annonces importantes du serveur apparaîtront ici dans un format magazine moderne.
            </p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Créer la première annonce
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Featured Announcement */}
            {featuredAnnouncement && (
              <FeaturedAnnouncement
                announcement={featuredAnnouncement}
                onClick={() => console.log('View announcement', featuredAnnouncement.id)}
              />
            )}

            {/* Grid */}
            {gridAnnouncements.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gridAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    onClick={() => console.log('View announcement', announcement.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Modal */}
      <CategoryFilterModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        categories={customCategories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
}
