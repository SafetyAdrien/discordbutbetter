import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { calculatePasswordStrength, type PasswordStrength } from '@/lib/password-security';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
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
