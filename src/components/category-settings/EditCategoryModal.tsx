import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen } from 'lucide-react';
import { CategoryOverview } from './CategoryOverview';
import { CategoryPermissions } from './CategoryPermissions';
import { CategoryDangerZone } from './CategoryDangerZone';
import { supabase } from '@/integrations/supabase/client';

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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
          e.stopPropagation();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
            Paramètres de {category?.name || categoryName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : category ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="overview" className="mt-0 space-y-6">
                <CategoryOverview 
                  category={category} 
                  onSaved={onClose}
                />
                <CategoryDangerZone 
                  categoryId={categoryId} 
                  categoryName={category.name} 
                  serverId={serverId}
                  channelCount={channelCount}
                  onDeleted={onClose} 
                />
              </TabsContent>

              <TabsContent value="permissions" className="mt-0">
                <CategoryPermissions categoryId={categoryId} serverId={serverId} />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <p className="text-muted-foreground text-center py-8">Catégorie introuvable</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
