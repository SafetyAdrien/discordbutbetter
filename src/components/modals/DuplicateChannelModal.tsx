import { useEffect, useRef, useState } from "react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DuplicateChannelModalProps {
  open: boolean;
  defaultName: string;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
}

export function DuplicateChannelModal({
  open,
  defaultName,
  isPending,
  onOpenChange,
  onConfirm,
}: DuplicateChannelModalProps) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, defaultName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    onConfirm(trimmed);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Dupliquer le salon">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="duplicate-channel-name">Nom du salon</Label>
          <Input
            id="duplicate-channel-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || isPending}
            className="bg-[#5865f2] hover:bg-[#5865f2]/90"
          >
            {isPending ? "Duplication..." : "Dupliquer"}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
