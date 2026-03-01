import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryOverview } from './CategoryOverview';
import { CategoryPermissions } from './CategoryPermissions';
import { CategoryDangerZone } from './CategoryDangerZone';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveModal } from '@/components/ui/responsive-modal';

interface EditCategoryModalProps {
  categoryId: string;
  categoryName: string;
  serverId: string;
  channelCount?: number;
  onClose: () => void;
}

interface CategoryDetails {
  id: string;
  name: string;
  server_id: string;
  position: number | null;
  created_at: string | null;
}

export function EditCategoryModal({ 
  categoryId, 
  categoryName,
  serverId, 
  channelCount = 0,
  onClose 
}: EditCategoryModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [category, setCategory] = useState<CategoryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategory = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();
      
      if (!error && data) {
        setCategory(data);
      }
      setIsLoading(false);
    };

    fetchCategory();
  }, [categoryId]);

  const tabItems = [
    { id: 'overview', label: 'Aperçu' },
    { id: 'permissions', label: 'Permissions' },
  ];

  return (
    <ResponsiveModal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title={`Paramètres de ${category?.name || categoryName}`}
      className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : category ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 px-1">
            {tabItems.map(item => (
              <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <CategoryOverview category={category} onSaved={onClose} />
              <CategoryDangerZone categoryId={categoryId} categoryName={category.name} serverId={serverId} channelCount={channelCount} onDeleted={onClose} />
            </TabsContent>
            <TabsContent value="permissions" className="mt-0">
              <CategoryPermissions categoryId={categoryId} serverId={serverId} />
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <p className="text-muted-foreground text-center py-8">Catégorie introuvable</p>
      )}
    </ResponsiveModal>
  );
}
