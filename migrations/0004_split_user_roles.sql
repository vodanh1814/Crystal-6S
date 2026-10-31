-- 0004_split_user_roles.sql
-- Split user roles into 'admin' | 'auditor' | 'manager' | 'viewer'

-- 1. Add new column with the updated CHECK constraint
ALTER TABLE users ADD COLUMN role_new TEXT NOT NULL DEFAULT 'auditor' CHECK (role_new IN ('admin', 'auditor', 'manager', 'viewer'));

-- 2. Migrate existing users:
-- If user has role 'user':
--   If they have any 'manager' assignment in user_areas -> set to 'manager'
--   Else -> set to 'auditor'
-- 'admin' and 'viewer' roles remain unchanged.
UPDATE users
SET role_new = CASE
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'viewer' THEN 'viewer'
  WHEN role = 'manager' THEN 'manager'
  WHEN role = 'auditor' THEN 'auditor'
  WHEN EXISTS (SELECT 1 FROM user_areas ua WHERE ua.user_id = users.id AND ua.role = 'manager') THEN 'manager'
  ELSE 'auditor'
END;

-- 3. Drop old role column and rename role_new to role
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users RENAME COLUMN role_new TO role;

-- 4. Clean up user_areas based on user's new single role:
-- For auditor: keep only role = 'auditor'
DELETE FROM user_areas
WHERE user_id IN (SELECT id FROM users WHERE role = 'auditor') AND role != 'auditor';

-- For manager: keep only role = 'manager'
DELETE FROM user_areas
WHERE user_id IN (SELECT id FROM users WHERE role = 'manager') AND role != 'manager';

-- For admin and viewer: clear user_areas completely
DELETE FROM user_areas
WHERE user_id IN (SELECT id FROM users WHERE role IN ('admin', 'viewer'));
