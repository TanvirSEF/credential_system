import type {
  CredentialTypePayload,
  DecryptedCredentialType,
  TemplateField,
} from "@/lib/types/credential-template"
import type { CredentialField } from "@/lib/types/credential"

function templateField(
  id: string,
  label: string,
  type: TemplateField["type"],
  options: Partial<TemplateField> = {}
): TemplateField {
  return {
    id,
    label,
    type,
    secret: type === "password",
    required: false,
    copyable: type !== "multiline" && type !== "boolean",
    sortOrder: 0,
    ...options,
  }
}

export const DEFAULT_CREDENTIAL_CATEGORIES: CredentialTypePayload[] = [
  {
    name: "Login",
    icon: "key",
    description: "Websites and applications",
    fields: [
      templateField("login-password", "Password", "password", {
        required: true,
      }),
    ],
  },
  {
    name: "Secure Note",
    icon: "file-text",
    description: "Private notes and text snippets",
    fields: [
      templateField("secure-note", "Secure content", "multiline", {
        secret: true,
        required: true,
      }),
    ],
  },
  {
    name: "API Key",
    icon: "code",
    description: "Developer and service API keys",
    fields: [
      templateField("api-key", "API key / token", "password", {
        required: true,
      }),
      templateField("api-secret", "API secret", "password"),
    ],
  },
  {
    name: "Wi-Fi",
    icon: "wifi",
    description: "Wireless network passwords",
    fields: [
      templateField("wifi-ssid", "Network name (SSID)", "text", {
        required: true,
      }),
      templateField("wifi-password", "Wi-Fi password", "password", {
        required: true,
      }),
    ],
  },
  {
    name: "Banking",
    icon: "credit-card",
    description: "Bank accounts and card references",
    fields: [
      templateField("bank-account", "Account number", "password", {
        required: true,
      }),
      templateField("bank-routing", "Routing / branch number", "text"),
      templateField("bank-pin", "PIN", "password"),
    ],
  },
]

const GENERAL_FIELDS = [
  templateField("general-password", "Password / secret", "password"),
]

function normalizedName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function resolveTemplateFields(
  category?: DecryptedCredentialType
): TemplateField[] {
  if (category?.payload.fields?.length) return category.payload.fields
  if (!category) return GENERAL_FIELDS

  const builtIn = DEFAULT_CREDENTIAL_CATEGORIES.find(
    (item) =>
      normalizedName(item.name) === normalizedName(category.payload.name)
  )

  return builtIn?.fields ?? GENERAL_FIELDS
}

export function createCredentialFields(
  category?: DecryptedCredentialType
): CredentialField[] {
  return resolveTemplateFields(category).map((field) => ({
    id: crypto.randomUUID(),
    label: field.label,
    type: field.type,
    value: "",
    secret: field.secret,
    required: field.required,
    copyable: field.copyable,
    options: field.options,
  }))
}
