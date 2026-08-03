import type { ProjectEnvironment, ProjectVariable } from "@/lib/types/project"

const SECRET_PATTERNS = [
  /SECRET/,
  /PASSWORD/,
  /PASSWD/,
  /TOKEN/,
  /PRIVATE.?KEY/,
  /CREDENTIAL/,
  /API.?KEY/,
  /ACCESS.?KEY/,
  /CLIENT.?SECRET/,
]

export function isSecretKey(key: string): boolean {
  const upper = key.toUpperCase()
  return (
    SECRET_PATTERNS.some((re) => re.test(upper)) ||
    /_KEY$/.test(upper) ||
    /_PWD$/.test(upper)
  )
}

function formatValue(value: string): string {
  if (value === "") return ""
  if (/[\s#"']/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`
  }
  return value
}

export function serializeEnv(env: ProjectEnvironment): string {
  return env.variables
    .map((v) => {
      const formatted = formatValue(v.value)
      return v.enabled ? `${v.key}=${formatted}` : `# ${v.key}=${formatted}`
    })
    .join("\n")
}

export function parseEnvText(text: string): ProjectVariable[] {
  const variables: ProjectVariable[] = []
  const lines = text.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    let enabled = true
    let body = line

    if (body.startsWith("#")) {
      body = body.slice(1).trim()
      enabled = false
    }

    body = body.replace(/^export\s+/i, "")

    const match = body.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const key = match[1]
    let value = match[2].trim()
    if (
      value.length >= 2 &&
      ((value[0] === '"' && value[value.length - 1] === '"') ||
        (value[0] === "'" && value[value.length - 1] === "'"))
    ) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n")
    }

    variables.push({
      id: crypto.randomUUID(),
      key,
      value,
      secret: isSecretKey(key),
      enabled,
    })
  }

  return variables
}

export function countVariables(envs: ProjectEnvironment[]): number {
  return envs.reduce((sum, env) => sum + env.variables.length, 0)
}
