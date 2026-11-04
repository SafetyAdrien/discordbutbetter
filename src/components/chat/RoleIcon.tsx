import { useState } from "react";
import { cn } from "@/lib/utils";

/*
 * Icone de role personnalisee, comme Discord : une case carree de taille
 * fixe (20px dans le chat, 16px dans la liste des membres) qui contient
 * l'image ou l'emoji, centree verticalement sur le nom. Une image qui ne
 * charge pas (URL de stockage obsolete) disparait au lieu d'afficher un cadre
 * vide. A appeler avec le role le plus eleve qui porte une icone
 * (`roles.find((r) => r.icon_url)`, les roles etant tries du plus haut au
 * plus bas).
 */

export interface RoleIconData {
  name: string;
  icon_url?: string | null;
}

export function RoleIcon({ role, size = 20, className }: { role: RoleIconData; size?: 16 | 20 | 24; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!role.icon_url || failed) return null;
  const isImage = /^(https?:|data:|blob:)/.test(role.icon_url);
  const box = size === 16 ? "w-4 h-4" : size === 24 ? "w-6 h-6" : "w-5 h-5";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", box, className)} aria-label={role.name}>
      {isImage ? (
        <img
          src={role.icon_url}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <span className="leading-none" style={{ fontSize: size * 0.9 }}>
          {role.icon_url}
        </span>
      )}
    </span>
  );
}
