export type FieldType =
  | "text"
  | "password"
  | "multiline"
  | "email"
  | "url"
  | "date"
  | "select"
  | "boolean"
  | "file";

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  secret: boolean;
  required: boolean;
  copyable: boolean;
  options?: string[];
  sortOrder: number;
}

export interface CredentialTypePayload {
  name: string;
  icon: string;
  description?: string;
  fields: TemplateField[];
}

export interface DecryptedCredentialType {
  id: string;
  vaultId: string;
  ownerId: string;
  parentId: string | null;
  sortOrder: number;
  archivedAt: Date | null;
  payload: CredentialTypePayload;
}
