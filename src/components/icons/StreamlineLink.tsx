import { Link } from './discord/lucide';

interface StreamlineLinkProps {
  className?: string;
  size?: number | string;
}

/** Icone "lien" de la planche Discord 2026. */
export function StreamlineLink({ className, size }: StreamlineLinkProps) {
  return <Link className={className} size={size} />;
}
