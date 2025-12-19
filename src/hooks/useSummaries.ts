import { useState, useCallback } from "react";

export interface SummaryTopic {
  id: number;
  title: string;
  summary: string;
  unreadCount: number;
  timeAgo: string;
  participants: string[];
  extra: number;
  newMessages?: number;
  newSummaries?: number;
}

// Mock data for development
export const MOCK_SUMMARIES: SummaryTopic[] = [
  {
    id: 1,
    title: "Cool PC Experiments",
    summary: "Discussion about cool PC experiments and regions exclusive features.",
    unreadCount: 10,
    timeAgo: "26 Min",
    participants: ["user1.png", "user2.png", "user3.png"],
    extra: 3,
    newMessages: 55,
    newSummaries: 7,
  },
  {
    id: 2,
    title: "Badge Goblins",
    summary: "Excitement over adding a badge for renting and the need for decent cashflow.",
    unreadCount: 8,
    timeAgo: "1 H",
    participants: ["user4.png", "user5.png"],
    extra: 0,
    newMessages: 23,
    newSummaries: 3,
  },
  {
    id: 3,
    title: "Server Updates",
    summary: "New features coming to the server including voice chat improvements.",
    unreadCount: 5,
    timeAgo: "2 H",
    participants: ["user1.png", "user3.png"],
    extra: 1,
    newMessages: 12,
    newSummaries: 2,
  },
];

export function useSummaries() {
  // Is the summaries feature enabled (bar visible)
  const [isSummariesEnabled, setIsSummariesEnabled] = useState(false);
  
  // Active topic (null = gray bar, object = blue bar)
  const [activeTopic, setActiveTopic] = useState<SummaryTopic | null>(null);
  
  // Is the dropdown panel open
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Toggle summaries on/off
  const toggleSummaries = useCallback(() => {
    setIsSummariesEnabled((prev) => {
      if (prev) {
        // Turning off - reset all state
        setActiveTopic(null);
        setIsDropdownOpen(false);
      }
      return !prev;
    });
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
  }, []);

  // Mark topic as read (closes blue bar)
  const markAsRead = useCallback(() => {
    setActiveTopic(null);
  }, []);

  // Clear active topic to go back to selection mode
  const clearActiveTopic = useCallback(() => {
    setActiveTopic(null);
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
    summaries: MOCK_SUMMARIES,
  };
}
