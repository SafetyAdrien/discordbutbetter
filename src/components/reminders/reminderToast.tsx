import { toast } from 'sonner';
import { Clock } from 'lucide-react';

/* Confirmation "Rappel ajouté." (video de reference) : pastille verte avec horloge, puis le texte. */
export function toastReminderAdded(text = 'Rappel ajouté.') {
  toast.custom(
    () => (
      <div role="status" className="flex items-center gap-3 h-[48px] pl-3 pr-5 rounded-lg bg-[#2b2b31] border border-white/[0.06] shadow-[0_8px_16px_rgba(0,0,0,0.35)] text-[15px] font-medium text-white">
        <span className="w-6 h-6 rounded-full bg-[#248046] flex items-center justify-center shrink-0"><Clock className="w-3.5 h-3.5 text-white" strokeWidth={2.5} /></span>
        {text}
      </div>
    ),
    { duration: 3000 },
  );
}
