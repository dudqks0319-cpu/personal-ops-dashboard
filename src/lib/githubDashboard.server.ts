import "server-only";

import {
  buildGitHubDashboard,
  type GitHubApiRepository,
  type GitHubApiUser,
  type GitHubDashboardData,
} from "./githubDashboard";

export const GITHUB_DATA_REVALIDATE_SECONDS = 6 * 60 * 60;

const MAX_REPOSITORY_PAGES = 10;
const GITHUB_API_ROOT = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

export class GitHubDashboardFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubDashboardFetchError";
  }
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "youngbin-personal-ops-dashboard",
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
}

async function fetchGitHubJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: buildHeaders(),
      next: { revalidate: GITHUB_DATA_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new GitHubDashboardFetchError(
      "GitHub에 연결하지 못했습니다. 잠시 뒤 다시 확인해 주세요.",
    );
  }

  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (response.status === 403 && remaining === "0") {
      throw new GitHubDashboardFetchError(
        "GitHub 공개 API 요청 한도에 도달했습니다. 캐시가 갱신될 때까지 잠시 기다려 주세요.",
      );
    }

    if (response.status === 404) {
      throw new GitHubDashboardFetchError("GitHub 계정을 찾지 못했습니다.");
    }

    throw new GitHubDashboardFetchError(
      "GitHub 데이터를 불러오지 못했습니다. 기존 Life OS 데이터에는 영향이 없습니다.",
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new GitHubDashboardFetchError("GitHub 응답 형식을 확인할 수 없습니다.");
  }
}

async function fetchOwnedPublicRepositories(username: string): Promise<GitHubApiRepository[]> {
  const repositories: GitHubApiRepository[] = [];

  for (let page = 1; page <= MAX_REPOSITORY_PAGES; page += 1) {
    const url = new URL(`${GITHUB_API_ROOT}/users/${encodeURIComponent(username)}/repos`);
    url.searchParams.set("type", "owner");
    url.searchParams.set("sort", "pushed");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const batch = await fetchGitHubJson<GitHubApiRepository[]>(url.toString());
    if (!Array.isArray(batch)) {
      throw new GitHubDashboardFetchError("GitHub 저장소 목록 형식을 확인할 수 없습니다.");
    }

    repositories.push(...batch);
    if (batch.length < 100) break;
  }

  return repositories;
}

export async function getGitHubDashboardData(
  username: string,
): Promise<GitHubDashboardData> {
  const normalizedUsername = username.trim();
  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw new GitHubDashboardFetchError("GitHub 계정 설정이 올바르지 않습니다.");
  }

  const [user, repositories] = await Promise.all([
    fetchGitHubJson<GitHubApiUser>(
      `${GITHUB_API_ROOT}/users/${encodeURIComponent(normalizedUsername)}`,
    ),
    fetchOwnedPublicRepositories(normalizedUsername),
  ]);

  return buildGitHubDashboard(user, repositories, new Date());
}
