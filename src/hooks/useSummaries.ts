import { useState, useCallback } from "react";

export interface SummaryTopic {
  id: number;
  title: string;
  summary: string;
  unreadCount: number;
  messageCount: number;
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
    title: "Lc.E",
    summary: "Discussion about lc.e and its use in the conversation.",
    unreadCount: 0,
    messageCount: 17,
    timeAgo: "2d Ago",
    participants: ["user1.png"],
    extra: 0,
    newMessages: 55,
    newSummaries: 7,
  },
  {
    id: 2,
    title: "Quests And New Quests",
    summary: "Discussion about quests and the availability of new quests at Celestia's place.",
    unreadCount: 0,
    messageCount: 19,
    timeAgo: "2d Ago",
    participants: ["user2.png"],
    extra: 0,
    newMessages: 23,
    newSummaries: 3,
  },
  {
    id: 3,
    title: "Tortoise Creation",
    summary: "Discussion about creating tortoises and tagging.",
    unreadCount: 0,
    messageCount: 7,
    timeAgo: "2d Ago",
    participants: ["user3.png"],
    extra: 0,
    newMessages: 12,
    newSummaries: 2,
  },
  {
    id: 4,
    title: "Orbtousd Vs. Google",
    summary: "Conversation about using different orbtousd addresses in the chat.",
    unreadCount: 0,
    messageCount: 19,
    timeAgo: "4d Ago",
    participants: ["user4.png"],
    extra: 0,
    newMessages: 8,
    newSummaries: 1,
  },
];

export function useSummaries() {
  // Summaries state (so we can mark as read)
  const [summaries, setSummaries] = useState<SummaryTopic[]>(MOCK_SUMMARIES);
  
  // Is the summaries feature enabled (bar visible)
  const [isSummariesEnabled, setIsSummariesEnabled] = useState(false);
  
  // Active topic (null = gray bar, object = blue bar)
  const [activeTopic, setActiveTopic] = useState<SummaryTopic | null>(null);
  
  // Is the dropdown panel open
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
  }, []);

  // Mark all summaries as read (resets newMessages to 0)
  const markAsRead = useCallback(() => {
    setSummaries((prev) =>
      prev.map((s) => ({ ...s, newMessages: 0, newSummaries: 0 }))
    );
    setActiveTopic(null);
    setIsDropdownOpen(false);
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
    summaries,
  };
}
