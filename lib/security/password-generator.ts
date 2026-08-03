export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  avoidAmbiguous: boolean
}

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const NUMBERS = "0123456789"
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?"
const AMBIGUOUS = new Set("Il1O0o|`'\"")

const ADJECTIVES = [
  "amber",
  "ancient",
  "autumn",
  "bright",
  "calm",
  "cedar",
  "clever",
  "coral",
  "crimson",
  "daring",
  "eager",
  "emerald",
  "fable",
  "gentle",
  "golden",
  "happy",
  "hidden",
  "indigo",
  "jolly",
  "lively",
  "lucky",
  "misty",
  "noble",
  "polar",
  "quiet",
  "rapid",
  "silver",
  "solar",
  "steady",
  "swift",
  "velvet",
  "vivid",
]

const NOUNS = [
  "badger",
  "beacon",
  "breeze",
  "brook",
  "canyon",
  "comet",
  "dolphin",
  "falcon",
  "forest",
  "garden",
  "harbor",
  "island",
  "jungle",
  "lantern",
  "meadow",
  "meteor",
  "mountain",
  "ocean",
  "otter",
  "panda",
  "pebble",
  "phoenix",
  "planet",
  "rabbit",
  "raven",
  "river",
  "sparrow",
  "summit",
  "thunder",
  "tiger",
  "willow",
  "wolf",
]

function randomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1) {
    throw new Error("Random range must be a positive safe integer.")
  }
  const maxUint32 = 0x1_0000_0000
  const limit = maxUint32 - (maxUint32 % maxExclusive)
  const value = new Uint32Array(1)
  do crypto.getRandomValues(value)
  while (value[0] >= limit)
  return value[0] % maxExclusive
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function generatePassword(options: PasswordOptions): string {
  const length = Math.min(128, Math.max(8, Math.floor(options.length)))
  const requiredSets = [
    options.lowercase ? LOWERCASE : "",
    options.uppercase ? UPPERCASE : "",
    options.numbers ? NUMBERS : "",
    options.symbols ? SYMBOLS : "",
  ]
    .filter(Boolean)
    .map((set) =>
      options.avoidAmbiguous
        ? [...set].filter((character) => !AMBIGUOUS.has(character)).join("")
        : set
    )
  if (requiredSets.length === 0) {
    throw new Error("Select at least one character group.")
  }

  const pool = requiredSets.join("")
  const characters = requiredSets.map((set) => set[randomInt(set.length)])
  while (characters.length < length) {
    characters.push(pool[randomInt(pool.length)])
  }
  return shuffled(characters).join("")
}

export function generatePassphrase(wordCount = 7, separator = "-"): string {
  const count = Math.min(12, Math.max(5, Math.floor(wordCount)))
  return Array.from({ length: count }, () => {
    const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)]
    const noun = NOUNS[randomInt(NOUNS.length)]
    return `${adjective}${noun}`
  }).join(separator)
}

export function estimatePasswordEntropy(
  value: string,
  poolSize?: number
): number {
  if (!value) return 0
  let inferredPool = 0
  if (/[a-z]/.test(value)) inferredPool += 26
  if (/[A-Z]/.test(value)) inferredPool += 26
  if (/\d/.test(value)) inferredPool += 10
  if (/[^A-Za-z0-9]/.test(value)) inferredPool += SYMBOLS.length
  return Math.round(value.length * Math.log2(poolSize || inferredPool || 1))
}
