import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Sofa, Lamp, Star, Gift, Sparkles, Gem, Crown } from "lucide-react";

interface FollowSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export function FollowSuccessModal({ open, onClose }: FollowSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border text-center">
        {/* Fun illustration area */}
        <div className="relative h-32 bg-gradient-to-b from-primary/10 to-transparent rounded-t-lg overflow-hidden mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Decorative elements */}
            <div className="absolute top-2 left-4 text-yellow-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="absolute top-6 right-8 text-green-400">
              <Gem className="w-3 h-3" />
            </div>
            <div className="absolute top-4 right-4 text-red-400">
              <Star className="w-4 h-4" />
            </div>
            <div className="absolute bottom-4 left-8 text-pink-400">
              <Lamp className="w-5 h-5" />
            </div>
            <div className="absolute bottom-2 left-16 text-orange-400">
              <Gift className="w-4 h-4" />
            </div>
            
            {/* Main character/furniture */}
            <div className="flex items-end gap-2">
              <div className="bg-primary/30 p-3 rounded-lg">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <div className="bg-blue-500/30 p-4 rounded-lg">
                <Sofa className="w-12 h-12 text-blue-400" />
              </div>
              <div className="text-yellow-400 flex flex-col items-center">
                <Crown className="w-4 h-4 mb-1" />
                <div className="w-8 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🕴️</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <h2 className="text-xl font-bold mb-2">
            Quel bel ajout à ton serveur.
          </h2>
          <h3 className="text-lg font-semibold text-muted-foreground mb-4">
            Dis donc, c'est sympa, ici.
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Les principales mises à jour de ce salon s'afficheront directement
            sur ton serveur. Profite bien !
          </p>
          <Button onClick={onClose} className="px-8">
            Compris !
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
