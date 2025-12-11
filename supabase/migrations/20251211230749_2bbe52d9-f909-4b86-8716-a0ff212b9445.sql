-- Ajouter les nouveaux types de salons à l'enum channel_type
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'media';
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'calendar';
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'tasks';