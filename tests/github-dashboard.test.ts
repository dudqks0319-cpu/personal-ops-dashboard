import assert from "node:assert/strict";
import test from "node:test";

type RawUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
};

type RawRepository = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
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
  pushed_at: string;
  updated_at: string;
  topics: string[];
  license: { spdx_id: string } | null;
};

type GitHubDashboardModule = {
  buildGitHubDashboard: (
    user: RawUser,
    repositories: RawRepository[],
    now: Date,
  ) => {
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
    activity: { week: number; month: number; quiet: number };
    languages: Array<{ name: string; count: number; percentage: number }>;
    repositories: Array<{
      name: string;
      fullName: string;
      url: string;
      activity: "week" | "month" | "quiet";
      isFork: boolean;
      isArchived: boolean;
    }>;
  };
  buildSafeRepositoryUrl: (fullName: string) => string | null;
  classifyRepositoryActivity: (
    pushedAt: string,
    now: Date,
  ) => "week" | "month" | "quiet";
};

async function loadDashboardModule(): Promise<GitHubDashboardModule | null> {
  const modulePath = "../src/lib/githubDashboard.ts";
  try {
    return (await import(modulePath)) as GitHubDashboardModule;
  } catch {
    return null;
  }
}

const user: RawUser = {
  login: "dudqks0319-cpu",
  name: "Youngbin",
  avatar_url: "https://avatars.githubusercontent.com/u/250593480?v=4",
  html_url: "https://github.com/dudqks0319-cpu",
  followers: 12,
  following: 3,
  public_repos: 4,
};

function repository(overrides: Partial<RawRepository> = {}): RawRepository {
  return {
    id: 1,
    name: "active-app",
    full_name: "dudqks0319-cpu/active-app",
    owner: { login: "dudqks0319-cpu" },
    private: false,
    visibility: "public",
    fork: false,
    archived: false,
    description: "A public app",
    homepage: null,
    language: "TypeScript",
    stargazers_count: 7,
    forks_count: 2,
    open_issues_count: 1,
    pushed_at: "2026-08-20T09:00:00Z",
    updated_at: "2026-08-20T09:00:00Z",
    topics: ["nextjs", "dashboard"],
    license: { spdx_id: "MIT" },
    ...overrides,
  };
}

test("GitHub dashboard module exists before dashboard behavior is evaluated", async () => {
  const dashboard = await loadDashboardModule();
  assert.ok(dashboard, "src/lib/githubDashboard.ts must exist");
});

test("only public repositories owned by the configured account are exposed", async () => {
  const dashboard = await loadDashboardModule();
  assert.ok(dashboard);

  const data = dashboard.buildGitHubDashboard(
    user,
    [
      repository(),
      repository({
        id: 2,
        name: "secret-app",
        full_name: "dudqks0319-cpu/secret-app",
        private: true,
        visibility: "private",
      }),
      repository({
        id: 3,
        name: "foreign-app",
        full_name: "another-owner/foreign-app",
        owner: { login: "another-owner" },
      }),
    ],
    new Date("2026-08-21T00:00:00Z"),
  );

  assert.equal(data.repositories.length, 1);
  assert.equal(data.repositories[0]?.fullName, "dudqks0319-cpu/active-app");
  assert.equal(data.repositories[0]?.url, "https://github.com/dudqks0319-cpu/active-app");
});

test("summary separates originals, forks, archives, and recent activity", async () => {
  const dashboard = await loadDashboardModule();
  assert.ok(dashboard);

  const data = dashboard.buildGitHubDashboard(
    user,
    [
      repository(),
      repository({
        id: 2,
        name: "monthly-app",
        full_name: "dudqks0319-cpu/monthly-app",
        pushed_at: "2026-08-02T09:00:00Z",
        language: "Swift",
        stargazers_count: 3,
        forks_count: 1,
        open_issues_count: 2,
      }),
      repository({
        id: 3,
        name: "quiet-fork",
        full_name: "dudqks0319-cpu/quiet-fork",
        fork: true,
        pushed_at: "2026-06-01T09:00:00Z",
        stargazers_count: 99,
        forks_count: 99,
        open_issues_count: 99,
      }),
      repository({
        id: 4,
        name: "archived-app",
        full_name: "dudqks0319-cpu/archived-app",
        archived: true,
        pushed_at: "2026-01-01T09:00:00Z",
        language: "TypeScript",
        stargazers_count: 2,
        forks_count: 0,
        open_issues_count: 0,
      }),
    ],
    new Date("2026-08-21T00:00:00Z"),
  );

  assert.deepEqual(data.summary, {
    publicRepositories: 4,
    originalRepositories: 3,
    forkedRepositories: 1,
    archivedRepositories: 1,
    active7d: 1,
    active30d: 2,
    totalStars: 12,
    totalForks: 3,
    totalOpenIssues: 3,
  });
  assert.deepEqual(data.activity, { week: 1, month: 1, quiet: 2 });
});

test("language distribution uses active original repositories only", async () => {
  const dashboard = await loadDashboardModule();
  assert.ok(dashboard);

  const data = dashboard.buildGitHubDashboard(
    user,
    [
      repository({ id: 1, name: "web-one", full_name: "dudqks0319-cpu/web-one" }),
      repository({ id: 2, name: "web-two", full_name: "dudqks0319-cpu/web-two" }),
      repository({
        id: 3,
        name: "ios-one",
        full_name: "dudqks0319-cpu/ios-one",
        language: "Swift",
      }),
      repository({
        id: 4,
        name: "forked-python",
        full_name: "dudqks0319-cpu/forked-python",
        fork: true,
        language: "Python",
      }),
      repository({
        id: 5,
        name: "archived-rust",
        full_name: "dudqks0319-cpu/archived-rust",
        archived: true,
        language: "Rust",
      }),
    ],
    new Date("2026-08-21T00:00:00Z"),
  );

  assert.deepEqual(data.languages, [
    { name: "TypeScript", count: 2, percentage: 67 },
    { name: "Swift", count: 1, percentage: 33 },
  ]);
});

test("activity boundaries and repository URLs fail closed", async () => {
  const dashboard = await loadDashboardModule();
  assert.ok(dashboard);

  const now = new Date("2026-08-21T00:00:00Z");
  assert.equal(dashboard.classifyRepositoryActivity("2026-08-14T00:00:00Z", now), "week");
  assert.equal(dashboard.classifyRepositoryActivity("2026-07-22T00:00:00Z", now), "month");
  assert.equal(dashboard.classifyRepositoryActivity("2026-07-21T23:59:59Z", now), "quiet");
  assert.equal(dashboard.buildSafeRepositoryUrl("dudqks0319-cpu/safe-repo"), "https://github.com/dudqks0319-cpu/safe-repo");
  assert.equal(dashboard.buildSafeRepositoryUrl("../../evil"), null);
  assert.equal(dashboard.buildSafeRepositoryUrl("owner/repo/extra"), null);
});
