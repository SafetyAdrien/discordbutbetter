import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Gamepad2, Check, X, ShieldAlert, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { checkPasswordPwned } from '@/lib/password-security';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

type AuthView = 'login' | 'forgot-password' | 'reset-password';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Email invalide').max(255, 'Email trop long'),
});

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Mot de passe trop court (min 8 caractères)')
    .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Doit contenir au moins un chiffre'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().trim().email('Email invalide').max(255, 'Email trop long'),
  password: z.string().min(6, 'Mot de passe trop court (min 6 caractères)'),
});

const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Nom d\'affichage requis')
    .max(50, 'Nom d\'affichage trop long (max 50 caractères)'),
  username: z
    .string()
    .trim()
    .min(3, 'Nom d\'utilisateur trop court (min 3 caractères)')
    .max(32, 'Nom d\'utilisateur trop long (max 32 caractères)')
    .regex(/^[a-z0-9_]+$/, 'Minuscules, chiffres et _ uniquement'),
  email: z.string().trim().email('Email invalide').max(255, 'Email trop long'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[0-9]{10,15}$/.test(val),
      'Format de téléphone invalide'
    ),
  password: z
    .string()
    .min(8, 'Mot de passe trop court (min 8 caractères)')
    .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Doit contenir au moins un chiffre'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // View state for password reset flow
  const [authView, setAuthView] = useState<AuthView>('login');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  
  // Username availability state
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Password security state
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [passwordPwnedCount, setPasswordPwnedCount] = useState<number | null>(null);

  // Listen for password recovery event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset-password');
        setPassword('');
        setConfirmPassword('');
        setErrors({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !authLoading && authView !== 'reset-password') {
      navigate('/');
    }
  }, [user, authLoading, navigate, authView]);

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (value: string) => {
    if (value.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Validate format first
    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase.rpc('check_username_availability', {
        p_username: value,
      });

      if (error) throw error;
      setUsernameAvailable(data);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  // Debounce effect for username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username);
      } else {
        setUsernameAvailable(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [username, checkUsernameAvailability]);

  const handleUsernameChange = (value: string) => {
    // Force lowercase and remove invalid characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);
    setUsernameAvailable(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Veuillez confirmer votre email avant de vous connecter');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Connexion réussie !');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse({ 
      email, 
      password, 
      username, 
      displayName,
      phone: phone || undefined,
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Check username availability before submitting
    if (usernameAvailable === false) {
      setErrors({ username: 'Ce nom d\'utilisateur est déjà pris' });
      return;
    }

    // Check if password has been compromised
    setCheckingPassword(true);
    setLoading(true);
    
    try {
      const pwnedCount = await checkPasswordPwned(password);
      setPasswordPwnedCount(pwnedCount);
      
      if (pwnedCount > 0) {
        setErrors({ 
          password: `Ce mot de passe a été trouvé dans ${pwnedCount.toLocaleString('fr-FR')} fuites de données. Veuillez en choisir un autre.` 
        });
        setLoading(false);
        setCheckingPassword(false);
        return;
      }
    } catch (error) {
      console.error('Error checking password:', error);
      // Continue with registration if check fails
    }
    
    setCheckingPassword(false);

    const { data, error } = await signUp(email, password, username, displayName);
    
    if (error) {
      setLoading(false);
      if (error.message.includes('already registered')) {
        toast.error('Cet email est déjà utilisé');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Save phone to private data table if provided
    if (phone && data?.user?.id) {
      const { error: phoneError } = await supabase
        .from('user_private_data')
        .upsert({ id: data.user.id, phone });
      
      if (phoneError) {
        console.error('Error saving phone:', phoneError);
      }
    }

    setLoading(false);
    toast.success('Compte créé avec succès !');
    navigate('/');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setForgotPasswordSent(true);
      toast.success('Lien de réinitialisation envoyé !');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Check if password has been compromised
    setCheckingPassword(true);
    setLoading(true);
    
    try {
      const pwnedCount = await checkPasswordPwned(password);
      setPasswordPwnedCount(pwnedCount);
      
      if (pwnedCount > 0) {
        setErrors({ 
          password: `Ce mot de passe a été trouvé dans ${pwnedCount.toLocaleString('fr-FR')} fuites de données. Veuillez en choisir un autre.` 
        });
        setLoading(false);
        setCheckingPassword(false);
        return;
      }
    } catch (error) {
      console.error('Error checking password:', error);
    }
    
    setCheckingPassword(false);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Mot de passe modifié avec succès !');
      setAuthView('login');
      setPassword('');
      setConfirmPassword('');
      navigate('/');
    }
  };

  const handleBackToLogin = () => {
    setAuthView('login');
    setForgotPasswordSent(false);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Forgot Password View
  if (authView === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 glow-border">
              <Gamepad2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">GameVault</h1>
            <p className="text-muted-foreground mt-2">
              Réinitialise ton mot de passe
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            {forgotPasswordSent ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 text-green-500 mb-2">
                  <Check className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold">Email envoyé !</h2>
                <p className="text-muted-foreground text-sm">
                  Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. 
                  Vérifie ta boîte mail et clique sur le lien pour définir un nouveau mot de passe.
                </p>
                <Button
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="w-full mt-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à la connexion
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Ton Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToLogin}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à la connexion
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Reset Password View
  if (authView === 'reset-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 glow-border">
              <Gamepad2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">GameVault</h1>
            <p className="text-muted-foreground mt-2">
              Définis ton nouveau mot de passe
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">Nouveau mot de passe</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordPwnedCount(null);
                  }}
                  className={errors.password ? 'border-destructive' : ''}
                />
                <PasswordStrengthIndicator password={password} />
                {errors.password && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{errors.password}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || checkingPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {checkingPassword ? 'Vérification de sécurité...' : 'Modification...'}
                  </>
                ) : (
                  'Modifier le mot de passe'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Login/Signup View (default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 glow-border">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">GameVault</h1>
          <p className="text-muted-foreground mt-2">
            Rejoins la communauté gaming
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass rounded-xl p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Ton Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setAuthView('forgot-password')}
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-displayname">Nom d'affichage</Label>
                  <Input
                    id="signup-displayname"
                    type="text"
                    placeholder="GamerPro42"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={errors.displayName ? 'border-destructive' : ''}
                  />
                  {errors.displayName && (
                    <p className="text-sm text-destructive">{errors.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-username">Nom d'utilisateur</Label>
                  <div className="relative">
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="gamerpro42"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className={`pr-10 ${errors.username ? 'border-destructive' : usernameAvailable === true ? 'border-green-500' : usernameAvailable === false ? 'border-destructive' : ''}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {!checkingUsername && usernameAvailable === true && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {!checkingUsername && usernameAvailable === false && (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  {errors.username && (
                    <p className="text-sm text-destructive">{errors.username}</p>
                  )}
                  {!errors.username && usernameAvailable === false && (
                    <p className="text-sm text-destructive">Ce nom d'utilisateur est déjà pris</p>
                  )}
                  {!errors.username && usernameAvailable === true && (
                    <p className="text-sm text-green-500">Nom d'utilisateur disponible</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Ton Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">
                    Numéro de Téléphone <span className="text-muted-foreground">(facultatif)</span>
                  </Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+33612345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordPwnedCount(null);
                    }}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  <PasswordStrengthIndicator password={password} />
                  {errors.password && (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{errors.password}</p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || usernameAvailable === false || checkingPassword}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {checkingPassword ? 'Vérification de sécurité...' : 'Création...'}
                    </>
                  ) : (
                    "S'inscrire"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
