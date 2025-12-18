import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderOpen, Shield, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryOverview } from './CategoryOverview';
import { CategoryPermissions } from './CategoryPermissions';
import { useUpdateCategory } from '@/hooks/useCategories';
import { toast } from 'sonner';

type SettingsTab = 'overview' | 'permissions';

interface CategorySettingsModalProps {
  categoryId: string;
  categoryName: string;
  serverId: string;
  onClose: () => void;
}

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Aperçu', icon: FolderOpen },
  { id: 'permissions', label: 'Permissions', icon: Shield },
];

export function CategorySettingsModal({ 
  categoryId, 
  categoryName: initialName, 
  serverId, 
  onClose 
}: CategorySettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [categoryName, setCategoryName] = useState(initialName);
  const updateCategory = useUpdateCategory();

  const hasChanges = categoryName.trim() !== initialName;

  const handleSave = () => {
    if (!categoryName.trim()) {
      toast.error('Le nom de la catégorie ne peut pas être vide');
      return;
    }

    if (categoryName.trim() !== initialName) {
      updateCategory.mutate(
        { categoryId, serverId, name: categoryName.trim() },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-4xl h-[85vh] p-0 overflow-hidden flex"
        onKeyDown={handleKeyDown}
      >
        {/* Sidebar */}
        <div className="w-56 bg-muted/30 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Paramètres de catégorie
            </h2>
            <p className="text-sm font-medium mt-1 truncate">{initialName}</p>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h1 className="text-lg font-semibold">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <CategoryOverview
                categoryId={categoryId}
                categoryName={categoryName}
                onNameChange={setCategoryName}
                onSave={handleSave}
              />
            )}

            {activeTab === 'permissions' && (
              <CategoryPermissions
                categoryId={categoryId}
                serverId={serverId}
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/20">
            <Button
              variant="secondary"
              onClick={handleCancel}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateCategory.isPending || !categoryName.trim()}
            >
              {updateCategory.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
