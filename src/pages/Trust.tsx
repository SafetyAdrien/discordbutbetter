import { Link } from "react-router-dom";
import { Shield, Lock, Database, Users, Mail, FileText, ArrowLeft } from "lucide-react";

export default function Trust() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Sécurité & Confiance</h1>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Cette page est maintenue par l'équipe de l'application pour répondre aux questions
            courantes sur la sécurité et la confidentialité. Il ne s'agit pas d'une certification
            indépendante.
          </p>
        </header>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Authentification & accès</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>Connexion par email/mot de passe et par téléphone (SMS).</li>
            <li>Mots de passe hachés côté serveur par le fournisseur d'authentification.</li>
            <li>Sessions utilisateur révocables depuis les paramètres du compte.</li>
            <li>Politique zéro collecte : aucun tracker tiers, aucune analytique externe.</li>
          </ul>
        </section>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Protection des données</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>
              Toutes les tables sensibles utilisent Row-Level Security pour restreindre l'accès
              aux propriétaires et membres autorisés.
            </li>
            <li>Les jetons de webhook sont masqués aux utilisateurs non autorisés.</li>
            <li>Les conversations privées ne sont visibles qu'aux participants.</li>
            <li>
              Les paramètres de serveur ne sont lisibles que par les membres du serveur concerné.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Modèle de partage</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>
              Les événements de calendrier marqués « publics » ne sont visibles que par vos amis
              et les personnes partageant un serveur ou une conversation avec vous.
            </li>
            <li>
              Les signaux WebRTC vocaux sont restreints aux membres autorisés à rejoindre le
              salon vocal concerné.
            </li>
            <li>Les rôles et permissions sont appliqués côté serveur.</li>
          </ul>
        </section>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Hébergement & infrastructure</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            L'application s'appuie sur Supabase pour l'authentification, la base de données
            et le stockage. Les responsabilités sont partagées : la plateforme fournit
            l'infrastructure et les contrôles techniques, l'équipe de l'application définit les
            règles d'accès et le traitement des données, et chaque utilisateur reste responsable
            de la confidentialité de ses identifiants.
          </p>
        </section>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Signaler une vulnérabilité</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Si vous découvrez un problème de sécurité, contactez l'équipe de l'application via
            les canaux indiqués dans les paramètres du compte. Merci de ne pas divulguer
            publiquement la vulnérabilité avant qu'un correctif soit déployé.
          </p>
        </section>

        <footer className="pt-6 border-t border-border text-xs text-muted-foreground">
          Contenu éditable maintenu par l'équipe de l'application. Dernière mise à jour&nbsp;:
          juin 2026.
        </footer>
      </div>
    </div>
  );
}
