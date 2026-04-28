-- Fix : policies RLS sur profiles pour que les users puissent lire/écrire leur propre profil
-- Sans ces policies, wallet_balance retourne toujours 0

-- S'assurer que RLS est activé
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS users_read_own_profile ON profiles;
DROP POLICY IF EXISTS users_update_own_profile ON profiles;
DROP POLICY IF EXISTS users_insert_own_profile ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Créer les policies
CREATE POLICY users_read_own_profile ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own_profile ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY users_insert_own_profile ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
