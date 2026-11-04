import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/*
 * Donnees de la page "Decouvrir" : serveurs publics avec leurs compteurs reels (fonction get_discovery_servers)
 * et annuaire d'applications (table discover_apps, geree par les administrateurs de l'app).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: object) => any };

export interface DiscoveryServer {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  discovery_category: string | null;
  member_count: number;
  online_count: number;
  created_at: string | null;
  is_member: boolean;
  is_community: boolean;
}

export interface DiscoverApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon_url: string | null;
  banner_url: string | null;
  category: 'games' | 'entertainment' | 'moderation' | 'social' | 'services';
  section: string;
  featured: boolean;
  server_count: number;
  languages: string[];
  commands: { name: string; description: string }[];
  links: { label: string; url: string; kind?: 'faq' | 'terms' | 'privacy' }[];
  gallery: string[];
  position: number;
}

export function useDiscoveryServers(category: string | null, query: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['discovery-servers', category, query],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<DiscoveryServer[]> => {
      const { data, error } = await sb.rpc('get_discovery_servers', { _category: category, _query: query || null });
      if (error) throw error;
      return ((data ?? []) as DiscoveryServer[]).map((s) => ({ ...s, member_count: Number(s.member_count), online_count: Number(s.online_count) }));
    },
  });
}

export function useDiscoverApps() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['discover-apps'],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<DiscoverApp[]> => {
      const { data, error } = await sb.from('discover_apps').select('*').eq('published', true).order('position', { ascending: true }).order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DiscoverApp[];
    },
  });
}

/** Categorie de Decouverte choisie pour un serveur (page Acces des parametres). */
export function useServerDiscoveryCategory(serverId: string) {
  return useQuery({
    queryKey: ['server-discovery-category', serverId],
    enabled: !!serverId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await sb.from('servers').select('discovery_category').eq('id', serverId).maybeSingle();
      if (error) throw error;
      return (data?.discovery_category as string | null) ?? null;
    },
  });
}
