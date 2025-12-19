import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SummaryTopic {
  id: string;
  title: string;
  summary: string;
  unreadCount: number;
  messageCount: number;
  timeAgo: string;
  participants: string[];
  extra: number;
  newMessages?: number;
  newSummaries?: number;
  isRead?: boolean;
}

interface ChannelSummary {
  id: string;
  channel_id: string;
  title: string;
  summary: string;
  message_count: number;
  participants: string[];
  created_at: string;
}

// Format relative time
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}j`;
  if (diffHours > 0) return `${diffHours}h`;
  if (diffMins > 0) return `${diffMins}m`;
  return "maintenant";
}

export function useSummaries(channelId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Is the summaries feature enabled (bar visible)
  const [isSummariesEnabled, setIsSummariesEnabled] = useState(false);
  
  // Active topic (null = gray bar, object = blue bar)
  const [activeTopic, setActiveTopic] = useState<SummaryTopic | null>(null);
  
  // Is the dropdown panel open
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Liked summaries (stored locally)
  const [likedSummaryIds, setLikedSummaryIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('liked_summaries');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch summaries from database
  const { data: dbSummaries = [], isLoading } = useQuery({
    queryKey: ['channel-summaries', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('channel_summaries')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching summaries:', error);
        return [];
      }
      return data as ChannelSummary[];
    },
    enabled: !!channelId && isSummariesEnabled,
  });

  // Fetch user's read states
  const { data: readStates = [] } = useQuery({
    queryKey: ['summary-read-states', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_summary_reads')
        .select('summary_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching read states:', error);
        return [];
      }
      return data.map(r => r.summary_id);
    },
    enabled: !!user?.id && isSummariesEnabled,
  });

  // Transform DB summaries to UI format
  const summaries: SummaryTopic[] = dbSummaries.map((s) => ({
    id: s.id,
    title: s.title,
    summary: s.summary,
    unreadCount: 0,
    messageCount: s.message_count || 0,
    timeAgo: formatTimeAgo(s.created_at),
    participants: s.participants || [],
    extra: Math.max(0, (s.participants?.length || 0) - 1),
    newMessages: readStates.includes(s.id) ? 0 : s.message_count,
    newSummaries: readStates.includes(s.id) ? 0 : 1,
    isRead: readStates.includes(s.id),
  }));

  // Generate new summaries mutation
  const generateSummaries = useMutation({
    mutationFn: async () => {
      if (!channelId) throw new Error('No channel selected');
      
      const { data, error } = await supabase.functions.invoke('summarize-channel', {
        body: { channelId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-summaries', channelId] });
      toast.success('Résumés générés avec succès');
    },
    onError: (error: any) => {
      console.error('Error generating summaries:', error);
      if (error.message?.includes('429')) {
        toast.error('Trop de requêtes, réessayez plus tard');
      } else if (error.message?.includes('402')) {
        toast.error('Crédits IA épuisés');
      } else {
        toast.error('Erreur lors de la génération des résumés');
      }
    },
  });

  // Toggle summaries on/off
  const toggleSummaries = useCallback(() => {
    setIsSummariesEnabled((prev) => !prev);
    setActiveTopic(null);
    setIsDropdownOpen(false);
  }, []);

  // Toggle dropdown panel
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  // Select a topic from the list
  const selectTopic = useCallback((topic: SummaryTopic) => {
    setActiveTopic(topic);
    setIsDropdownOpen(false);
    
    // Mark as read in database
    if (user?.id && !topic.isRead) {
      supabase
        .from('user_summary_reads')
        .upsert({ user_id: user.id, summary_id: topic.id })
        .then(({ error }) => {
          if (error) console.error('Error marking summary as read:', error);
          else queryClient.invalidateQueries({ queryKey: ['summary-read-states', user.id] });
        });
    }
  }, [user?.id, queryClient]);

  // Mark all summaries as read
  const markAsRead = useCallback(async () => {
    if (!user?.id || summaries.length === 0) return;

    const unreadSummaries = summaries.filter(s => !s.isRead);
    if (unreadSummaries.length === 0) {
      setActiveTopic(null);
      setIsDropdownOpen(false);
      return;
    }

    const { error } = await supabase
      .from('user_summary_reads')
      .upsert(
        unreadSummaries.map(s => ({ user_id: user.id, summary_id: s.id }))
      );

    if (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors du marquage comme lu');
    } else {
      queryClient.invalidateQueries({ queryKey: ['summary-read-states', user.id] });
      setActiveTopic(null);
      setIsDropdownOpen(false);
    }
  }, [user?.id, summaries, queryClient]);

  // Clear active topic to go back to selection mode
  const clearActiveTopic = useCallback(() => {
    setActiveTopic(null);
  }, []);

  // Toggle like on a summary
  const toggleLike = useCallback((summaryId: string) => {
    setLikedSummaryIds(prev => {
      const newLiked = prev.includes(summaryId)
        ? prev.filter(id => id !== summaryId)
        : [...prev, summaryId];
      localStorage.setItem('liked_summaries', JSON.stringify(newLiked));
      return newLiked;
    });
  }, []);

  return {
    isSummariesEnabled,
    activeTopic,
    isDropdownOpen,
    toggleSummaries,
    toggleDropdown,
    closeDropdown,
    selectTopic,
    markAsRead,
    clearActiveTopic,
    summaries,
    isLoading,
    generateSummaries: generateSummaries.mutate,
    isGenerating: generateSummaries.isPending,
    likedSummaryIds,
    toggleLike,
  };
}
