import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Mail, Lock, Trash2, ShieldCheck, Loader2, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AccountSettings() {
  const { profile, user, signOut, updateProfile } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const handleChangeUsername = async () => {
    const trimmed = newUsername.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Le nom d'utilisateur ne peut pas être vide");
      return;
    }
    if (trimmed === profile?.username) {
      setIsChangingUsername(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data: isAvailable, error: rpcError } = await supabase.rpc('check_username_availability', { p_username: trimmed });
      if (rpcError) throw rpcError;
      if (!isAvailable) {
        toast.error("Ce nom d'utilisateur est déjà pris");
        return;
      }
      await updateProfile({ username: trimmed });
      toast.success("Nom d'utilisateur mis à jour");
      setIsChangingUsername(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du changement de nom d'utilisateur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success("Mot de passe mis à jour avec succès");
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du changement de mot de passe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordByEmail = async () => {
    if (!user?.email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success("Un email de réinitialisation a été envoyé à votre adresse");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      toast.success("Un email de confirmation a été envoyé à votre nouvelle adresse");
      setIsChangingEmail(false);
      setNewEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du changement d'email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Déconnexion réussie");
  };

  const handleDeleteAccount = async () => {
    toast.info("La suppression de compte sera bientôt disponible");
  };

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations du compte</CardTitle>
          <CardDescription>Gérez les informations de base de votre compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {profile?.display_name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg">{profile?.display_name}</p>
              {!isChangingUsername ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">{profile?.username}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setNewUsername(profile?.username || "");
                      setIsChangingUsername(true);
                    }}
                  >
                    Modifier
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 mt-1">
                  <Input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                    placeholder="nom_utilisateur"
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Le nom d'utilisateur doit être unique et en minuscules.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChangingUsername(false)}
                    >
                      Annuler
                    </Button>
                    <Button size="sm" onClick={handleChangeUsername} disabled={isLoading}>
                      {isLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1">{user?.email}</span>
            </div>
          </div>

          {!isChangingEmail ? (
            <Button variant="outline" onClick={() => setIsChangingEmail(true)}>
              Modifier l'email
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Nouvel email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nouveau@email.com"
                />
                <p className="text-xs text-muted-foreground">Un email de confirmation sera envoyé à cette adresse.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingEmail(false);
                    setNewEmail("");
                  }}
                >
                  Annuler
                </Button>
                <Button onClick={handleChangeEmail} disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Envoyer la confirmation
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Mot de passe
          </CardTitle>
          <CardDescription>Modifiez votre mot de passe pour sécuriser votre compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isChangingPassword ? (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                Changer le mot de passe
              </Button>
              <Button variant="secondary" onClick={handleResetPasswordByEmail} disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Réinitialiser par email
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                >
                  Annuler
                </Button>
                <Button onClick={handleChangePassword} disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Authentification à deux facteurs
          </CardTitle>
          <CardDescription>Ajoutez une couche de sécurité supplémentaire à votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                L'authentification à deux facteurs sera disponible prochainement
              </p>
            </div>
            <Button variant="outline" disabled>
              Configurer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
