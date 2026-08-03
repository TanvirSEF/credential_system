-- Enable Row Level Security on all core tables
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_key_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Table Policies
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
CREATE POLICY "Users can manage own profile"
  ON profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Vaults Table Policies
DROP POLICY IF EXISTS "Users can insert own vault" ON vaults;
CREATE POLICY "Users can insert own vault"
  ON vaults FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own vault" ON vaults;
CREATE POLICY "Users can view own vault"
  ON vaults FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own vault" ON vaults;
CREATE POLICY "Users can update own vault"
  ON vaults FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own vault" ON vaults;
CREATE POLICY "Users can delete own vault"
  ON vaults FOR DELETE
  USING (owner_id = auth.uid());

-- 3. Vault Key Envelopes Table Policies
DROP POLICY IF EXISTS "Users can manage own key envelopes" ON vault_key_envelopes;
CREATE POLICY "Users can manage own key envelopes"
  ON vault_key_envelopes FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = vault_key_envelopes.vault_id
        AND vaults.owner_id = auth.uid()
    )
  );

-- 4. Credential Types Table Policies
DROP POLICY IF EXISTS "Users can manage own credential types" ON credential_types;
CREATE POLICY "Users can manage own credential types"
  ON credential_types FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND char_length(payload_ciphertext) <= 1500000
    AND EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = credential_types.vault_id
        AND vaults.owner_id = auth.uid()
    )
  );

-- 5. Credentials Table Policies
DROP POLICY IF EXISTS "Users can manage own credentials" ON credentials;
CREATE POLICY "Users can manage own credentials"
  ON credentials FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND char_length(payload_ciphertext) <= 1500000
    AND EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = credentials.vault_id
        AND vaults.owner_id = auth.uid()
    )
    AND (
      type_id IS NULL
      OR EXISTS (
        SELECT 1 FROM credential_types
        WHERE credential_types.id = credentials.type_id
          AND credential_types.vault_id = credentials.vault_id
          AND credential_types.owner_id = auth.uid()
      )
    )
  );

-- 6. Projects Table Policies
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
CREATE POLICY "Users can manage own projects"
  ON projects FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND char_length(payload_ciphertext) <= 1500000
    AND EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = projects.vault_id
        AND vaults.owner_id = auth.uid()
    )
  );

-- 7. Notes Table Policies
DROP POLICY IF EXISTS "Users can manage own notes" ON notes;
CREATE POLICY "Users can manage own notes"
  ON notes FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND char_length(payload_ciphertext) <= 1500000
    AND EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = notes.vault_id
        AND vaults.owner_id = auth.uid()
    )
  );

-- 8. Documents Table Policies
DROP POLICY IF EXISTS "Users can manage own documents" ON documents;
CREATE POLICY "Users can manage own documents"
  ON documents FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND char_length(metadata_ciphertext) <= 131072
    AND ciphertext_size BETWEEN 17 AND 52428816
    AND EXISTS (
      SELECT 1 FROM vaults
      WHERE vaults.id = documents.vault_id
        AND vaults.owner_id = auth.uid()
    )
    AND (
      credential_id IS NULL
      OR EXISTS (
        SELECT 1 FROM credentials
        WHERE credentials.id = documents.credential_id
          AND credentials.vault_id = documents.vault_id
          AND credentials.owner_id = auth.uid()
      )
    )
  );
