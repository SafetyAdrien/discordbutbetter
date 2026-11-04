import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FollowSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

/* "Quel bel ajout a ton serveur." (video de reference) : illustration du
   salon meuble qui deborde au-dessus de la fenetre, puis le texte. */
export function FollowSuccessModal({ open, onClose }: FollowSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-visible text-center">
        <div className="relative h-[60px]">
          <div className="absolute left-1/2 -translate-x-1/2 -top-[92px] w-[300px] h-[150px] rounded-[40px_40px_12px_12px] bg-[#3b3d5a] overflow-hidden" aria-hidden="true">
            <div className="absolute bottom-0 inset-x-0 h-4 bg-[#2a2c45]" />
            <div className="absolute left-[150px] bottom-6 w-[110px] h-[46px] rounded-xl bg-[#4f6bff]" />
            <div className="absolute left-[144px] bottom-14 w-[122px] h-[22px] rounded-t-xl bg-[#6280ff]" />
            <div className="absolute left-[30px] bottom-4 w-[44px] h-[34px] rounded bg-[#e3e5f0]" />
            <div className="absolute left-[40px] bottom-[38px] w-[3px] h-[30px] bg-[#e3e5f0]" />
            <div className="absolute left-[30px] bottom-[64px] w-[22px] h-[14px] rounded-t-full bg-[#eb459e]" />
            <div className="absolute left-[90px] bottom-4 w-[40px] h-[30px] rounded bg-[#f0b232]" />
            <div className="absolute left-[110px] top-[20px] w-[38px] h-[52px] rounded-full bg-black" />
            <div className="absolute right-[24px] top-[30px] w-[70px] h-[4px] bg-[#8b5a2b]" />
            <span className="absolute right-[60px] top-[10px] text-lg">🔮</span>
            <span className="absolute right-[30px] top-[8px] text-lg">🏠</span>
            <span className="absolute left-[22px] top-[18px] text-[#a5b0ff]">✦</span>
          </div>
        </div>
        <div className="px-8 pb-8">
          <DialogTitle className="text-2xl font-bold text-white leading-8">
            Quel bel ajout à ton serveur. Dis donc, c'est classe, ici.
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            Les principales mises à jour de ce salon s'afficheront directement sur ton serveur. Profite bien !
          </DialogDescription>
          <Button onClick={onClose} className="mt-6 h-11 px-6 text-base">Compris !</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
