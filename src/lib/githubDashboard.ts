export type RepositoryActivity = "week" | "month" | "quiet";

export type GitHubApiUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
};

export type GitHubApiRepository = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string } | null;
  private: boolean;
  visibility: string;
  fork: boolean;
  archived: boolean;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  updated_at: string;
  topics: string[];
  license: { spdx_id: string } | null;
};

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string;
  updatedAt: string;
  daysSincePush: number | null;
  activity: RepositoryActivity;
  topics: string[];
  license: string | null;
  isFork: boolean;
  isArchived: boolean;
};

export type GitHubDashboardData = {
  profile: {
    login: string;
    name: string;
    avatarUrl: string;
    url: string;
    followers: number;
    following: number;
  };
  summary: {
    publicRepositories: number;
    originalRepositories: number;
    forkedRepositories: number;
    archivedRepositories: number;
    active7d: number;
    active30d: number;
    totalStars: number;
    totalForks: number;
    totalOpenIssues: number;
  };
  activity: {
    week: number;
    month: number;
    quiet: number;
  };
  languages: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  recentRepositories: GitHubRepository[];
  repositories: GitHubRepository[];
  syncedAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function cleanDate(value: unknown): string {
  if (typeof value !== "string") return "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

function cleanLogin(value: unknown): string {
  const login = cleanText(value, 39);
  return GITHUB_LOGIN_PATTERN.test(login) ? login : "";
}

function cleanAvatarUrl(value: unknown): string {
  if (typeof value !== "string") return "";

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname !== "avatars.githubusercontent.com") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

export function buildSafeRepositoryUrl(fullName: string): string | null {
  const parts = fullName.split("/");
  if (parts.length !== 2) return null;

  const [owner, repository] = parts;
  if (!owner || !repository) return null;
  if (!GITHUB_LOGIN_PATTERN.test(owner) || !REPOSITORY_NAME_PATTERN.test(repository)) {
    return null;
  }

  return `https://github.com/${owner}/${repository}`;
}

function buildSafeProfileUrl(login: string): string {
  return GITHUB_LOGIN_PATTERN.test(login) ? `https://github.com/${login}` : "https://github.com";
}

export function classifyRepositoryActivity(
  pushedAt: string,
  now: Date,
): RepositoryActivity {
  const pushedTime = Date.parse(pushedAt);
  const nowTime = now.getTime();
  if (!Number.isFinite(pushedTime) || !Number.isFinite(nowTime)) return "quiet";

  const elapsed = Math.max(0, nowTime - pushedTime);
  if (elapsed <= 7 * DAY_MS) return "week";
  if (elapsed <= 30 * DAY_MS) return "month";
  return "quiet";
}

function getDaysSincePush(pushedAt: string, now: Date): number | null {
  const pushedTime = Date.parse(pushedAt);
  if (!Number.isFinite(pushedTime)) return null;
  return Math.max(0, Math.floor((now.getTime() - pushedTime) / DAY_MS));
}

function normalizeRepository(
  repository: GitHubApiRepository,
  ownerLogin: string,
  now: Date,
): GitHubRepository | null {
  const repositoryOwner = cleanLogin(repository.owner?.login);
  if (
    repository.private !== false ||
    repository.visibility !== "public" ||
    repositoryOwner.toLowerCase() !== ownerLogin.toLowerCase()
  ) {
    return null;
  }

  const fullName = cleanText(repository.full_name, 141);
  const url = buildSafeRepositoryUrl(fullName);
  const [fullNameOwner] = fullName.split("/");
  if (!url || fullNameOwner.toLowerCase() !== ownerLogin.toLowerCase()) return null;

  const name = cleanText(repository.name, 100);
  if (!name || !REPOSITORY_NAME_PATTERN.test(name)) return null;

  const pushedAt = cleanDate(repository.pushed_at);
  const updatedAt = cleanDate(repository.updated_at);
  const topics = Array.isArray(repository.topics)
    ? Array.from(
        new Set(
          repository.topics
            .map((topic) => cleanText(topic, 40).toLowerCase())
            .filter(Boolean),
        ),
      ).slice(0, 5)
    : [];

  return {
    id: cleanCount(repository.id),
    name,
    fullName,
    url,
    description: cleanText(repository.description, 180),
    language: cleanText(repository.language, 40) || null,
    stars: cleanCount(repository.stargazers_count),
    forks: cleanCount(repository.forks_count),
    openIssues: cleanCount(repository.open_issues_count),
    pushedAt,
    updatedAt,
    daysSincePush: getDaysSincePush(pushedAt, now),
    activity: classifyRepositoryActivity(pushedAt, now),
    topics,
    license: cleanText(repository.license?.spdx_id, 30) || null,
    isFork: repository.fork === true,
    isArchived: repository.archived === true,
  };
}

function repositorySort(a: GitHubRepository, b: GitHubRepository): number {
  if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;

  const activityOrder: Record<RepositoryActivity, number> = {
    week: 0,
    month: 1,
    quiet: 2,
  };
  const activityDifference = activityOrder[a.activity] - activityOrder[b.activity];
  if (activityDifference !== 0) return activityDifference;

  const pushedDifference = Date.parse(b.pushedAt) - Date.parse(a.pushedAt);
  if (Number.isFinite(pushedDifference) && pushedDifference !== 0) return pushedDifference;

  return a.name.localeCompare(b.name, "ko");
}

function buildLanguages(repositories: GitHubRepository[]) {
  const counts = new Map<string, number>();
  for (const repository of repositories) {
    if (repository.isFork || repository.isArchived || !repository.language) continue;
    counts.set(repository.language, (counts.get(repository.language) ?? 0) + 1);
  }

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    }));
}

export function buildGitHubDashboard(
  user: GitHubApiUser,
  rawRepositories: GitHubApiRepository[],
  now = new Date(),
): GitHubDashboardData {
  const login = cleanLogin(user.login);
  if (!login) {
    throw new Error("GitHub account data is invalid.");
  }

  const repositories = rawRepositories
    .map((repository) => normalizeRepository(repository, login, now))
    .filter((repository): repository is GitHubRepository => repository !== null)
    .sort(repositorySort);

  const originals = repositories.filter((repository) => !repository.isFork);
  const activity = repositories.reduce(
    (summary, repository) => {
      summary[repository.activity] += 1;
      return summary;
    },
    { week: 0, month: 0, quiet: 0 },
  );

  const activeRepositories = repositories.filter((repository) => !repository.isArchived);

  return {
    profile: {
      login,
      name: cleanText(user.name, 80) || login,
      avatarUrl: cleanAvatarUrl(user.avatar_url),
      url: buildSafeProfileUrl(login),
      followers: cleanCount(user.followers),
      following: cleanCount(user.following),
    },
    summary: {
      publicRepositories: repositories.length,
      originalRepositories: originals.length,
      forkedRepositories: repositories.length - originals.length,
      archivedRepositories: repositories.filter((repository) => repository.isArchived).length,
      active7d: activeRepositories.filter((repository) => repository.activity === "week").length,
      active30d: activeRepositories.filter((repository) => repository.activity !== "quiet").length,
      totalStars: originals.reduce((sum, repository) => sum + repository.stars, 0),
      totalForks: originals.reduce((sum, repository) => sum + repository.forks, 0),
      totalOpenIssues: originals.reduce((sum, repository) => sum + repository.openIssues, 0),
    },
    activity,
    languages: buildLanguages(repositories),
    recentRepositories: activeRepositories.slice(0, 6),
    repositories,
    syncedAt: now.toISOString(),
  };
}
