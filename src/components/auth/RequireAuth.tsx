import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

/**
 * Garde de route unique pour toutes les pages qui exigent un utilisateur
 * connecté. Affiche l'écran de chargement pendant l'initialisation de la
 * session, puis redirige vers /auth si aucun utilisateur n'est présent.
 *
 * Utiliser systématiquement pour toute nouvelle route protégée :
 *   <Route path="/x" element={<RequireAuth><X/></RequireAuth>} />
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoadingScreen />;
  return <>{children}</>;
}

export default RequireAuth;
