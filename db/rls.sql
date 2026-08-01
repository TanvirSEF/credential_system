-- Enable Row Level Security on all core tables
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_key_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Table Policies
CREATE POLICY "Users can manage own profile"
  ON profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Vaults Table Policies
CREATE POLICY "Users can insert own vault"
  ON vaults FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view own vault"
  ON vaults FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can update own vault"
  ON vaults FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own vault"
  ON vaults FOR DELETE
  USING (owner_id = auth.uid());

-- 3. Vault Key Envelopes Table Policies
CREATE POLICY "Users can manage own key envelopes"
  ON vault_key_envelopes FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 4. Credential Types Table Policies
CREATE POLICY "Users can manage own credential types"
  ON credential_types FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 5. Credentials Table Policies
CREATE POLICY "Users can manage own credentials"
  ON credentials FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 6. Documents Table Policies
CREATE POLICY "Users can manage own documents"
  ON documents FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
