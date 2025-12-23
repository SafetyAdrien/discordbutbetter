import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchExpandableProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchExpandable({ value, onChange, placeholder = 'Rechercher...' }: SearchExpandableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    onChange('');
  };

  const handleBlur = () => {
    if (!value) {
      setIsOpen(false);
    }
  };

  if (isOpen) {
    return (
      <div className="relative flex items-center animate-scale-in origin-right">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-48 h-8 text-sm pr-8"
          onBlur={handleBlur}
        />
        <button
          onClick={handleClose}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded transition-colors"
          type="button"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="p-1.5 hover:bg-muted rounded transition-colors"
      type="button"
    >
      <Search className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
