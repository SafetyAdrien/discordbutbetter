import { X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { RememberedAccount } from '@/hooks/useRememberedAccounts';

interface Props {
  accounts: RememberedAccount[];
  onSelectAccount: (account: RememberedAccount) => void;
  onRemoveAccount: (id: string) => void;
}

export function RememberedAccountsCard({ accounts, onSelectAccount, onRemoveAccount }: Props) {
  return (
    <div className="glass rounded-xl p-4 w-72 flex-shrink-0">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Comptes enregistrés
      </h3>
      
      <div className="space-y-2">
        {accounts.map((account) => (
          <div
            key={account.id}
            onClick={() => onSelectAccount(account)}
            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer relative transition-colors"
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={account.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {account.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Infos */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {account.displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{account.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {account.email}
              </p>
            </div>
            
            {/* Bouton supprimer */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAccount(account.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-opacity"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
