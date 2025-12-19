import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type ServerPermission = Database['public']['Enums']['server_permission'];

export interface CategoryPermissionOverride {
  id: string;
  category_id: string;
  role_id: string | null;
  permission: ServerPermission;
  type: 'allow' | 'deny';
  created_at: string | null;
}

export function useCategoryPermissionOverrides(categoryId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['category-permissions', categoryId],
    queryFn: async (): Promise<CategoryPermissionOverride[]> => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from('category_permission_overrides')
        .select('*')
        .eq('category_id', categoryId);

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        type: d.type as 'allow' | 'deny'
      }));
    },
    enabled: !!categoryId && !!user,
  });
}

export function useSetCategoryPermissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      roleId,
      permission,
      type,
    }: {
      categoryId: string;
      roleId: string;
      permission: ServerPermission;
      type: 'allow' | 'deny';
    }) => {
      const { error } = await supabase
        .from('category_permission_overrides')
        .upsert(
          {
            category_id: categoryId,
            role_id: roleId,
            permission,
            type,
          },
          { onConflict: 'category_id,role_id,permission' }
        );

      if (error) throw error;
      return { categoryId, roleId, permission, type };
    },
    onMutate: async ({ categoryId, roleId, permission, type }) => {
      await queryClient.cancelQueries({ queryKey: ['category-permissions', categoryId] });
      const previousOverrides = queryClient.getQueryData<CategoryPermissionOverride[]>(['category-permissions', categoryId]);
      
      const existingIndex = previousOverrides?.findIndex(
        o => o.role_id === roleId && o.permission === permission
      );
      
      const newOverride: CategoryPermissionOverride = {
        id: `temp-${Date.now()}`,
        category_id: categoryId,
        role_id: roleId,
        permission,
        type,
        created_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData<CategoryPermissionOverride[]>(['category-permissions', categoryId], old => {
        if (!old) return [newOverride];
        if (existingIndex !== undefined && existingIndex >= 0) {
          return old.map((o, i) => i === existingIndex ? newOverride : o);
        }
        return [...old, newOverride];
      });
      
      return { previousOverrides, categoryId };
    },
    onError: (_, { categoryId }, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(['category-permissions', categoryId], context.previousOverrides);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['category-permissions', variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ['user-channel-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['channel-permission'] });
    },
  });
}

export function useRemoveCategoryPermissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      roleId,
      permission,
    }: {
      categoryId: string;
      roleId: string;
      permission: ServerPermission;
    }) => {
      const { error } = await supabase
        .from('category_permission_overrides')
        .delete()
        .eq('category_id', categoryId)
        .eq('role_id', roleId)
        .eq('permission', permission);

      if (error) throw error;
      return { categoryId, roleId, permission };
    },
    onMutate: async ({ categoryId, roleId, permission }) => {
      await queryClient.cancelQueries({ queryKey: ['category-permissions', categoryId] });
      const previousOverrides = queryClient.getQueryData<CategoryPermissionOverride[]>(['category-permissions', categoryId]);
      
      queryClient.setQueryData<CategoryPermissionOverride[]>(['category-permissions', categoryId], old =>
        old?.filter(o => !(o.role_id === roleId && o.permission === permission))
      );
      
      return { previousOverrides, categoryId };
    },
    onError: (_, { categoryId }, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(['category-permissions', categoryId], context.previousOverrides);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['category-permissions', variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ['user-channel-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['channel-permission'] });
    },
  });
}

export function useSyncCategoryWithServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId }: { categoryId: string }) => {
      // Remove all overrides for this category (sync with server)
      const { error } = await supabase
        .from('category_permission_overrides')
        .delete()
        .eq('category_id', categoryId);

      if (error) throw error;
      return { categoryId };
    },
    onMutate: async ({ categoryId }) => {
      await queryClient.cancelQueries({ queryKey: ['category-permissions', categoryId] });
      const previousOverrides = queryClient.getQueryData<CategoryPermissionOverride[]>(['category-permissions', categoryId]);
      
      queryClient.setQueryData(['category-permissions', categoryId], []);
      
      return { previousOverrides, categoryId };
    },
    onError: (_, { categoryId }, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(['category-permissions', categoryId], context.previousOverrides);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['category-permissions', variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ['user-channel-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['channel-permission'] });
    },
  });
}

// Réinitialiser les permissions d'un rôle spécifique sur une catégorie
export function useResetRoleCategoryOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, roleId }: { categoryId: string; roleId: string }) => {
      const { error } = await supabase
        .from('category_permission_overrides')
        .delete()
        .eq('category_id', categoryId)
        .eq('role_id', roleId);

      if (error) throw error;
      return { categoryId, roleId };
    },
    onMutate: async ({ categoryId, roleId }) => {
      await queryClient.cancelQueries({ queryKey: ['category-permissions', categoryId] });
      const previousOverrides = queryClient.getQueryData<CategoryPermissionOverride[]>(['category-permissions', categoryId]);
      
      queryClient.setQueryData<CategoryPermissionOverride[]>(['category-permissions', categoryId], old =>
        old?.filter(o => o.role_id !== roleId)
      );
      
      return { previousOverrides, categoryId };
    },
    onError: (_, { categoryId }, context) => {
      if (context?.previousOverrides) {
        queryClient.setQueryData(['category-permissions', categoryId], context.previousOverrides);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['category-permissions', variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ['user-channel-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['channel-permission'] });
    },
  });
}
