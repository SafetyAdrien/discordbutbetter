import { useMemo } from 'react';
import { Check, X, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { calculatePasswordStrength, type PasswordStrength } from '@/lib/password-security';

interface PasswordStrengthIndicatorProps {
  password: string;
  pwnedCount?: number | null;
  checkingPwned?: boolean;
}

export function PasswordStrengthIndicator({ 
  password, 
  pwnedCount, 
  checkingPwned 
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="h-1.5 flex-1 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: index <= strength.score ? strength.color : 'hsl(var(--muted))',
            }}
          />
        ))}
      </div>
      
      {/* Strength label */}
      <p className="text-xs font-medium" style={{ color: strength.color }}>
        Force : {strength.label}
      </p>

      {/* Criteria checklist */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <CriteriaItem passed={strength.checks.minLength} label="8 caractères min." />
        <CriteriaItem passed={strength.checks.hasUppercase} label="Une majuscule" />
        <CriteriaItem passed={strength.checks.hasLowercase} label="Une minuscule" />
        <CriteriaItem passed={strength.checks.hasNumber} label="Un chiffre" />
        <CriteriaItem passed={strength.checks.hasSpecial} label="Caractère spécial" optional />
      </div>

      {/* HIBP Check Status */}
      {(checkingPwned || pwnedCount !== undefined) && (
        <div className="pt-2 border-t border-border/50">
          <HibpStatus checkingPwned={checkingPwned} pwnedCount={pwnedCount} />
        </div>
      )}
    </div>
  );
}

function CriteriaItem({ passed, label, optional }: { passed: boolean; label: string; optional?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${passed ? 'text-green-500' : 'text-muted-foreground'}`}>
      {passed ? (
        <Check className="w-3 h-3 shrink-0" />
      ) : (
        <X className="w-3 h-3 shrink-0" />
      )}
      <span>
        {label}
        {optional && <span className="text-muted-foreground/70"> (opt.)</span>}
      </span>
    </div>
  );
}

function HibpStatus({ checkingPwned, pwnedCount }: { checkingPwned?: boolean; pwnedCount?: number | null }) {
  if (checkingPwned) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Vérification des fuites de données...</span>
      </div>
    );
  }

  if (pwnedCount === null || pwnedCount === undefined) {
    return null;
  }

  if (pwnedCount === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-500">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Non trouvé dans les fuites de données</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-orange-500">
      <ShieldAlert className="w-3.5 h-3.5" />
      <span>Trouvé dans {pwnedCount.toLocaleString('fr-FR')} fuites de données</span>
    </div>
  );
}
