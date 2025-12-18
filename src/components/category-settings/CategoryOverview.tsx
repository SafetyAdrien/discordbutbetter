import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CategoryOverviewProps {
  categoryId: string;
  categoryName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
}

export function CategoryOverview({ 
  categoryId, 
  categoryName, 
  onNameChange,
  onSave 
}: CategoryOverviewProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="category-name">Nom de la catégorie</Label>
        <Input
          id="category-name"
          value={categoryName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nom de la catégorie"
          className="max-w-md"
        />
      </div>
    </div>
  );
}
