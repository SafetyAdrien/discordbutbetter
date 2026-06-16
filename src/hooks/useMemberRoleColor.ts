import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemberWithProfile } from "@/hooks/useMembers";

/**
 * Reactive role color for a member in a server context.
 * Reads from the ['members', serverId] cache so it updates instantly on
 * optimistic role mutations and realtime member_roles changes.
 *
 * Returns the highest-positioned (non-@everyone) role color, or undefined.
 */
export function useMemberRoleColor(serverId?: string | null, userId?: string | null): string | undefined {
  const queryClient = useQueryClient();

  const { data: color } = useQuery<MemberWithProfile[], Error, string | undefined>({
    queryKey: ["members", serverId],
    queryFn: () =>
      Promise.resolve(queryClient.getQueryData<MemberWithProfile[]>(["members", serverId ?? ""]) ?? []),
    enabled: !!serverId && !!userId,
    select: (members) => {
      if (!userId) return undefined;
      const member = members?.find((m) => m.user?.id === userId);
      if (!member) return undefined;
      const sorted = [...(member.roles ?? [])]
        .filter((r: any) => r && r.name !== "@everyone")
        .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0));
      return sorted[0]?.color ?? undefined;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return color ?? undefined;
}
