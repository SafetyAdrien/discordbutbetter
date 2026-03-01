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
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [category, setCategory] = useState<CategoryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isMobile } = useBreakpoint();

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

  const renderTabContent = () => {
    if (!category) return null;
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <CategoryOverview category={category} onSaved={onClose} />
            <CategoryDangerZone categoryId={categoryId} categoryName={category.name} serverId={serverId} channelCount={channelCount} onDeleted={onClose} />
          </div>
        );
      case 'permissions':
        return <CategoryPermissions categoryId={categoryId} serverId={serverId} />;
      default:
        return null;
    }
  };

  // Mobile: fullscreen 2-level navigation
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {activeTab === null ? (
          <>
            <div className="h-12 px-3 flex items-center gap-2 border-b border-border flex-shrink-0">
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm flex-1 truncate">
                Paramètres de {category?.name || categoryName}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <nav className="space-y-0.5">
                  {tabItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {item.label}
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="h-12 px-3 flex items-center gap-2 border-b border-border flex-shrink-0">
              <button onClick={() => setActiveTab(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-semibold text-sm flex-1 truncate">
                {tabItems.find(t => t.id === activeTab)?.label}
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderTabContent()}
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop: Dialog with tabs
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
        <Tabs value={activeTab || 'overview'} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            {tabItems.map(item => (
              <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
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
