-- Enable REPLICA IDENTITY FULL for permission tables to get complete payloads in Realtime
ALTER TABLE channel_permission_overrides REPLICA IDENTITY FULL;
ALTER TABLE category_permission_overrides REPLICA IDENTITY FULL;
ALTER TABLE role_permissions REPLICA IDENTITY FULL;
ALTER TABLE roles REPLICA IDENTITY FULL;
ALTER TABLE member_roles REPLICA IDENTITY FULL;