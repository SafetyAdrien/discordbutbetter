import { Eye, TrendingUp, Calendar } from 'lucide-react';

interface AnnouncementStatsProps {
  totalCount: number;
  thisWeekCount: number;
  totalViews?: number;
}

export function AnnouncementStats({ totalCount, thisWeekCount, totalViews }: AnnouncementStatsProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4" />
        <span>{totalCount} annonces</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4" />
        <span>{thisWeekCount} cette semaine</span>
      </div>
      {totalViews !== undefined && (
        <div className="flex items-center gap-1.5">
          <Eye className="w-4 h-4" />
          <span>{totalViews} vues</span>
        </div>
      )}
    </div>
  );
}
