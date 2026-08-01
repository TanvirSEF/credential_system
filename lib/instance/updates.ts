import "server-only";

const DEFAULT_GITHUB_REPOSITORY = "TanvirSEF/credential_system";
const UPDATE_COMMAND = "sudo sh /opt/secure-personal-vault/scripts/update.sh";

type GitHubRelease = {
  tag_name?: unknown;
  name?: unknown;
  body?: unknown;
  html_url?: unknown;
  published_at?: unknown;
};

export type InstanceUpdateStatus =
  | { isOwner: false }
  | {
      isOwner: true;
      currentVersion: string;
      state: "available" | "current" | "unavailable" | "development";
      latestVersion?: string;
      releaseName?: string;
      releaseNotes?: string;
      releaseUrl?: string;
      publishedAt?: string;
      updateCommand?: string;
    };

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, "").split("+")[0];
}

function parseSemver(version: string) {
  const match = normalizeVersion(version).match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/
  );
  if (!match) return null;

  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])] as const,
    prerelease: match[4] || null,
  };
}

function isNewerVersion(latest: string, current: string) {
  const latestSemver = parseSemver(latest);
  const currentSemver = parseSemver(current);

  if (!latestSemver || !currentSemver) {
    return normalizeVersion(latest) !== normalizeVersion(current);
  }

  for (let index = 0; index < 3; index += 1) {
    if (latestSemver.numbers[index] > currentSemver.numbers[index]) return true;
    if (latestSemver.numbers[index] < currentSemver.numbers[index]) return false;
  }

  if (currentSemver.prerelease && !latestSemver.prerelease) return true;
  if (!currentSemver.prerelease) return false;
  return (latestSemver.prerelease || "") > currentSemver.prerelease;
}

function configuredRepository() {
  const repository =
    process.env.SP_VAULT_GITHUB_REPOSITORY || DEFAULT_GITHUB_REPOSITORY;

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("SP_VAULT_GITHUB_REPOSITORY must use the owner/repository format.");
  }

  return repository;
}

export function isInstanceOwner(userId: string) {
  const ownerId = process.env.INSTANCE_OWNER_USER_ID?.trim();
  return Boolean(ownerId && ownerId === userId);
}

export async function getOwnerUpdateStatus(
  userId: string
): Promise<InstanceUpdateStatus> {
  if (!isInstanceOwner(userId)) return { isOwner: false };

  const currentVersion = process.env.APP_VERSION?.trim() || "local";
  if (currentVersion === "local" || currentVersion === "development") {
    return { isOwner: true, currentVersion, state: "development" };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${configuredRepository()}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "secure-personal-vault-update-checker",
          "X-GitHub-Api-Version": "2026-03-10",
        },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return { isOwner: true, currentVersion, state: "unavailable" };
    }

    const release = (await response.json()) as GitHubRelease;
    const latestVersion =
      typeof release.tag_name === "string" ? release.tag_name.trim() : "";

    if (!latestVersion) {
      return { isOwner: true, currentVersion, state: "unavailable" };
    }

    const releaseDetails = {
      latestVersion,
      releaseName:
        typeof release.name === "string" && release.name.trim()
          ? release.name.trim()
          : latestVersion,
      releaseNotes:
        typeof release.body === "string"
          ? release.body.trim().slice(0, 6000)
          : "",
      releaseUrl:
        typeof release.html_url === "string" ? release.html_url : undefined,
      publishedAt:
        typeof release.published_at === "string"
          ? release.published_at
          : undefined,
    };

    if (!isNewerVersion(latestVersion, currentVersion)) {
      return {
        isOwner: true,
        currentVersion,
        state: "current",
        ...releaseDetails,
      };
    }

    return {
      isOwner: true,
      currentVersion,
      state: "available",
      ...releaseDetails,
      updateCommand: UPDATE_COMMAND,
    };
  } catch (error) {
    console.warn("Release update check failed:", error);
    return { isOwner: true, currentVersion, state: "unavailable" };
  }
}
