/**
 * Password security utilities using HaveIBeenPwned API
 * Uses k-anonymity to check passwords without sending the actual password
 */

/**
 * Generates SHA-1 hash of a string
 */
async function sha1(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Checks if a password has been exposed in data breaches using HIBP API
 * Uses k-anonymity: only the first 5 characters of the SHA-1 hash are sent
 * @returns Number of times the password was found in breaches, or 0 if not found
 */
export async function checkPasswordPwned(password: string): Promise<number> {
  try {
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true', // Adds padding to prevent response size analysis
      },
    });

    if (!response.ok) {
      console.error('HIBP API error:', response.status);
      return 0; // Fail open - don't block registration if API is down
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return parseInt(count.trim(), 10);
      }
    }

    return 0;
  } catch (error) {
    console.error('Error checking password with HIBP:', error);
    return 0; // Fail open
  }
}

/**
 * Password strength criteria
 */
export interface PasswordStrength {
  score: number; // 0-4
  label: 'Très faible' | 'Faible' | 'Moyen' | 'Fort' | 'Très fort';
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Calculates password strength
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  
  // Bonus for length
  let score = passedChecks;
  if (password.length >= 12) score += 0.5;
  if (password.length >= 16) score += 0.5;

  // Cap at 5
  score = Math.min(score, 5);

  // Map to 0-4 scale
  const normalizedScore = Math.floor((score / 5) * 4);

  const labels: PasswordStrength['label'][] = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = ['hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(45, 93%, 47%)', 'hsl(142, 71%, 45%)', 'hsl(142, 76%, 36%)'];

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    color: colors[normalizedScore],
    checks,
  };
}
