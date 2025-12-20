-- Activer REPLICA IDENTITY FULL pour recevoir toutes les colonnes dans les événements DELETE
ALTER TABLE channel_permission_overrides REPLICA IDENTITY FULL;
ALTER TABLE category_permission_overrides REPLICA IDENTITY FULL;
ALTER TABLE member_roles REPLICA IDENTITY FULL;