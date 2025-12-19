export interface ConversationSummary {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  messageCount: number;
  participants: string[];
  participantCount: number;
  feedback: 'up' | 'down' | null;
}

export const mockSummaries: ConversationSummary[] = [
  {
    id: "sum_001",
    title: "Experiment And Nameplates",
    summary: "Discussion about an experiment and its cost and nameplates.",
    timestamp: "Il y a 24 Min",
    messageCount: 19,
    participants: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Max"
    ],
    participantCount: 5,
    feedback: null
  },
  {
    id: "sum_002",
    title: "Winter Drop Variant",
    summary: "Discussion about the rarity and value of the winter drop variant in PES.",
    timestamp: "Il y a 25 Min",
    messageCount: 16,
    participants: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan"
    ],
    participantCount: 3,
    feedback: null
  },
  {
    id: "sum_003",
    title: "Server Rules Update",
    summary: "Admins discussed updating the community guidelines and moderation policies.",
    timestamp: "Il y a 1 Heure",
    messageCount: 42,
    participants: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin1",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Mod1",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Mod2"
    ],
    participantCount: 7,
    feedback: 'up'
  },
  {
    id: "sum_004",
    title: "Event Planning Weekend",
    summary: "Community event planning for the upcoming weekend tournament.",
    timestamp: "Il y a 2 Heures",
    messageCount: 28,
    participants: [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Planner1",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Planner2"
    ],
    participantCount: 2,
    feedback: null
  }
];
