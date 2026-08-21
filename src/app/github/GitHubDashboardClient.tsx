"use client";

import Image from "next/image";
import { type CSSProperties, useMemo, useState } from "react";
import type {
  GitHubDashboardData,
  GitHubRepository,
  RepositoryActivity,
} from "@/lib/githubDashboard";
import styles from "./github.module.css";

type RepositoryFilter =
  | "all"
  | "week"
  | "month"
  | "quiet"
  | "original"
  | "fork"
  | "archived";

const INITIAL_REPOSITORY_COUNT = 12;
const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Seoul",
});
const SYNC_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

const FILTERS: Array<{ key: RepositoryFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "week", label: "7일 이내" },
  { key: "month", label: "30일 이내" },
  { key: "quiet", label: "30일 이상" },
  { key: "original", label: "직접 만든 저장소" },
  { key: "fork", label: "포크" },
  { key: "archived", label: "보관됨" },
];

const ACTIVITY_LABELS: Record<RepositoryActivity, string> = {
  week: "7일 이내 업데이트",
  month: "30일 이내 업데이트",
  quiet: "30일 이상 업데이트 없음",
};

function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

function formatRepositoryTime(repository: GitHubRepository): string {
  if (repository.daysSincePush === null) return "업데이트 기록 없음";
  if (repository.daysSincePush === 0) return "오늘 업데이트";
  if (repository.daysSincePush === 1) return "어제 업데이트";
  if (repository.daysSincePush <= 30) return `${repository.daysSincePush}일 전 업데이트`;

  const date = new Date(repository.pushedAt);
  return Number.isFinite(date.getTime())
    ? `${DATE_FORMATTER.format(date)} 업데이트`
    : "업데이트 기록 없음";
}

function formatSyncedAt(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? SYNC_FORMATTER.format(date) : "동기화 시각 미확인";
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function RepositoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 4.5h11A2.5 2.5 0 0 1 19 7v12.5h-12A2.5 2.5 0 0 1 4.5 17V5.5a1 1 0 0 1 1-1Z" />
      <path d="M7 16.5h12M8 8h7M8 11h5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7" cy="5" r="2" />
      <circle cx="17" cy="5" r="2" />
      <circle cx="12" cy="19" r="2" />
      <path d="M7 7v2.5a3 3 0 0 0 3 3h2M17 7v2.5a3 3 0 0 1-3 3h-2v4.5" />
    </svg>
  );
}

function IssueIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5M12 16.5v.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 19 6v5c0 4.8-2.7 8.2-7 10-4.3-1.8-7-5.2-7-10V6l7-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

function matchesFilter(repository: GitHubRepository, filter: RepositoryFilter): boolean {
  switch (filter) {
    case "week":
      return !repository.isArchived && repository.activity === "week";
    case "month":
      return !repository.isArchived && repository.activity !== "quiet";
    case "quiet":
      return repository.activity === "quiet";
    case "original":
      return !repository.isFork;
    case "fork":
      return repository.isFork;
    case "archived":
      return repository.isArchived;
    default:
      return true;
  }
}

function filterCount(repositories: GitHubRepository[], filter: RepositoryFilter): number {
  return repositories.filter((repository) => matchesFilter(repository, filter)).length;
}

function RepositoryMeta({ repository }: { repository: GitHubRepository }) {
  return (
    <div className={styles.repositoryMetrics} aria-label="저장소 지표">
      <span title="Stars">
        <StarIcon />
        {formatNumber(repository.stars)}
      </span>
      <span title="Forks">
        <ForkIcon />
        {formatNumber(repository.forks)}
      </span>
      <span title="Open issues / pull requests">
        <IssueIcon />
        {formatNumber(repository.openIssues)}
      </span>
    </div>
  );
}

export function GitHubDashboardClient({ data }: { data: GitHubDashboardData }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RepositoryFilter>("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_REPOSITORY_COUNT);

  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const filteredRepositories = useMemo(() => {
    return data.repositories.filter((repository) => {
      if (!matchesFilter(repository, filter)) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        repository.name,
        repository.fullName,
        repository.description,
        repository.language ?? "",
        ...repository.topics,
      ]
        .join(" ")
        .toLocaleLowerCase("ko-KR");

      return searchable.includes(normalizedQuery);
    });
  }, [data.repositories, filter, normalizedQuery]);

  const visibleRepositories = filteredRepositories.slice(0, visibleCount);
  const activityMaximum = Math.max(
    data.activity.week,
    data.activity.month,
    data.activity.quiet,
    1,
  );
  const activeShare = data.summary.publicRepositories
    ? Math.round((data.summary.active30d / data.summary.publicRepositories) * 100)
    : 0;

  const updateQuery = (value: string) => {
    setQuery(value);
    setVisibleCount(INITIAL_REPOSITORY_COUNT);
  };

  const updateFilter = (value: RepositoryFilter) => {
    setFilter(value);
    setVisibleCount(INITIAL_REPOSITORY_COUNT);
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="github-dashboard-title">
        <div className={styles.heroIdentity}>
          <div className={styles.avatarFrame}>
            {data.profile.avatarUrl ? (
              <Image
                src={data.profile.avatarUrl}
                alt=""
                width={84}
                height={84}
                priority
                sizes="84px"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span aria-hidden="true">YB</span>
            )}
          </div>
          <div className={styles.heroCopy}>
            <p>{data.profile.name} · {data.profile.login}</p>
            <h1 id="github-dashboard-title">내 GitHub, 지금 무엇이 움직이나</h1>
            <span>
              공개 프로젝트의 최근 흐름만 모았습니다. 비공개 저장소와 추측성 상태 표시는 제외합니다.
            </span>
          </div>
        </div>

        <a
          className={styles.heroAction}
          href={data.profile.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub 프로필 열기
          <ExternalIcon />
        </a>

        <div className={styles.heroPulse}>
          <div className={styles.heroPulseLabel}>
            <span>최근 30일 움직인 저장소</span>
            <strong>
              {formatNumber(data.summary.active30d)}
              <small> / {formatNumber(data.summary.publicRepositories)}</small>
            </strong>
          </div>
          <div
            className={styles.heroMeter}
            role="progressbar"
            aria-label="최근 30일 활동 저장소 비율"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={activeShare}
          >
            <span style={{ width: `${activeShare}%` }} />
          </div>
          <p>
            {activeShare}% · 마지막 push 시각 기준
            <span>최근 동기화 {formatSyncedAt(data.syncedAt)}</span>
          </p>
        </div>

        <dl className={styles.heroProfileStats}>
          <div>
            <dt>Followers</dt>
            <dd>{formatNumber(data.profile.followers)}</dd>
          </div>
          <div>
            <dt>Following</dt>
            <dd>{formatNumber(data.profile.following)}</dd>
          </div>
          <div>
            <dt>Open items</dt>
            <dd>{formatNumber(data.summary.totalOpenIssues)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.summaryRail} aria-label="GitHub 요약">
        <article>
          <span>공개 저장소</span>
          <strong>{formatNumber(data.summary.publicRepositories)}</strong>
          <small>이 화면에 표시되는 전체</small>
        </article>
        <article>
          <span>직접 만든 저장소</span>
          <strong>{formatNumber(data.summary.originalRepositories)}</strong>
          <small>포크를 제외한 원본</small>
        </article>
        <article>
          <span>최근 30일 활동</span>
          <strong>{formatNumber(data.summary.active30d)}</strong>
          <small>보관 저장소 제외</small>
        </article>
        <article>
          <span>받은 Stars</span>
          <strong>{formatNumber(data.summary.totalStars)}</strong>
          <small>직접 만든 저장소 합계</small>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="recent-projects-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="recent-projects-title">최근 움직인 프로젝트</h2>
            <p>가장 최근에 push된 공개 저장소를 빠르게 열어볼 수 있습니다.</p>
          </div>
          <span>{data.recentRepositories.length}개 표시</span>
        </div>

        {data.recentRepositories.length > 0 ? (
          <div className={styles.recentGrid}>
            {data.recentRepositories.map((repository, index) => (
              <article className={styles.recentCard} key={repository.id || repository.fullName}>
                <div className={styles.recentTopline}>
                  <span className={styles.recentNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.activityState} data-activity={repository.activity}>
                    <i aria-hidden="true" />
                    {ACTIVITY_LABELS[repository.activity]}
                  </span>
                </div>
                <div className={styles.recentBody}>
                  <h3>
                    <a href={repository.url} target="_blank" rel="noopener noreferrer">
                      {repository.name}
                    </a>
                  </h3>
                  <p>{repository.description || "저장소 설명이 아직 등록되지 않았습니다."}</p>
                </div>
                <div className={styles.recentFooter}>
                  <span>{repository.language || "언어 정보 없음"}</span>
                  <RepositoryMeta repository={repository} />
                  <a
                    className={styles.iconLink}
                    href={repository.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${repository.name} 저장소 열기`}
                  >
                    <ExternalIcon />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>표시할 최근 공개 저장소가 없습니다.</p>
        )}
      </section>

      <div className={styles.insightGrid}>
        <section className={styles.insightPanel} aria-labelledby="activity-title">
          <div className={styles.sectionHeaderCompact}>
            <div>
              <h2 id="activity-title">업데이트 흐름</h2>
              <p>상태 추측 없이 마지막 push 간격만 비교합니다.</p>
            </div>
            <strong>{formatNumber(data.summary.publicRepositories)}</strong>
          </div>

          <div className={styles.activityBars}>
            {[
              { key: "week", label: "최근 7일", value: data.activity.week },
              { key: "month", label: "8–30일", value: data.activity.month },
              { key: "quiet", label: "30일 이상", value: data.activity.quiet },
            ].map((item) => (
              <div className={styles.activityRow} key={item.key}>
                <div>
                  <span>{item.label}</span>
                  <strong>{formatNumber(item.value)}</strong>
                </div>
                <div className={styles.activityTrack} aria-hidden="true">
                  <span
                    data-activity={item.key}
                    style={{ width: `${Math.round((item.value / activityMaximum) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.activityFootnote}>
            <span>보관됨 {formatNumber(data.summary.archivedRepositories)}</span>
            <span>포크 {formatNumber(data.summary.forkedRepositories)}</span>
          </div>
        </section>

        <section className={styles.insightPanel} aria-labelledby="language-title">
          <div className={styles.sectionHeaderCompact}>
            <div>
              <h2 id="language-title">주요 개발 언어</h2>
              <p>활성 원본 저장소의 GitHub 대표 언어 기준입니다.</p>
            </div>
            <strong>{data.languages.length}</strong>
          </div>

          {data.languages.length > 0 ? (
            <div className={styles.languageList}>
              {data.languages.slice(0, 7).map((language) => (
                <div
                  className={styles.languageRow}
                  key={language.name}
                  style={{ "--share": `${language.percentage}%` } as CSSProperties & Record<"--share", string>}
                >
                  <div>
                    <span>{language.name}</span>
                    <small>{formatNumber(language.count)}개 저장소</small>
                  </div>
                  <strong>{language.percentage}%</strong>
                  <div className={styles.languageTrack} aria-hidden="true">
                    <span />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>언어 정보가 등록된 활성 원본 저장소가 없습니다.</p>
          )}
        </section>
      </div>

      <section className={styles.explorer} aria-labelledby="repository-explorer-title">
        <div className={styles.explorerHeader}>
          <div>
            <h2 id="repository-explorer-title">저장소 탐색</h2>
            <p>이름, 설명, 언어, 토픽으로 공개 저장소를 찾습니다.</p>
          </div>
          <strong>
            {formatNumber(filteredRepositories.length)}
            <span> / {formatNumber(data.repositories.length)}</span>
          </strong>
        </div>

        <div className={styles.explorerToolbar}>
          <label className={styles.searchField}>
            <span className={styles.srOnly}>저장소 검색</span>
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="예: jipbab, Swift, dashboard"
              autoComplete="off"
            />
          </label>

          <div className={styles.filters} aria-label="저장소 필터">
            {FILTERS.map((option) => (
              <button
                type="button"
                key={option.key}
                data-active={filter === option.key}
                aria-pressed={filter === option.key}
                onClick={() => updateFilter(option.key)}
              >
                <span>{option.label}</span>
                <small>{formatNumber(filterCount(data.repositories, option.key))}</small>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.repositoryList}>
          {visibleRepositories.length > 0 ? (
            visibleRepositories.map((repository) => (
              <article
                className={styles.repositoryRow}
                data-archived={repository.isArchived}
                key={repository.id || repository.fullName}
              >
                <div className={styles.repositoryGlyph} data-activity={repository.activity}>
                  <RepositoryIcon />
                </div>

                <div className={styles.repositoryMain}>
                  <div className={styles.repositoryTitleRow}>
                    <h3>
                      <a href={repository.url} target="_blank" rel="noopener noreferrer">
                        {repository.name}
                      </a>
                    </h3>
                    <div className={styles.repositoryTags}>
                      {repository.isArchived && <span data-kind="archived">보관됨</span>}
                      {repository.isFork ? (
                        <span data-kind="fork">포크</span>
                      ) : (
                        <span data-kind="original">원본</span>
                      )}
                    </div>
                  </div>
                  <p>{repository.description || "저장소 설명이 아직 등록되지 않았습니다."}</p>
                  <div className={styles.repositoryDetails}>
                    <span>{repository.language || "언어 정보 없음"}</span>
                    {repository.license && <span>{repository.license}</span>}
                    {repository.topics.slice(0, 3).map((topic) => (
                      <span key={topic}>#{topic}</span>
                    ))}
                  </div>
                </div>

                <RepositoryMeta repository={repository} />

                <div className={styles.repositoryUpdate}>
                  <span data-activity={repository.activity}>
                    <i aria-hidden="true" />
                    {formatRepositoryTime(repository)}
                  </span>
                  <small>{ACTIVITY_LABELS[repository.activity]}</small>
                </div>

                <a
                  className={styles.rowLink}
                  href={repository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${repository.name} 저장소 열기`}
                >
                  <ExternalIcon />
                </a>
              </article>
            ))
          ) : (
            <div className={styles.noResults}>
              <SearchIcon />
              <strong>조건에 맞는 저장소가 없습니다.</strong>
              <p>검색어를 줄이거나 다른 필터를 선택해 보세요.</p>
              <button
                type="button"
                onClick={() => {
                  updateQuery("");
                  updateFilter("all");
                }}
              >
                검색 초기화
              </button>
            </div>
          )}
        </div>

        {visibleRepositories.length < filteredRepositories.length && (
          <button
            type="button"
            className={styles.loadMore}
            onClick={() => setVisibleCount((current) => current + INITIAL_REPOSITORY_COUNT)}
          >
            저장소 더 보기
            <span>
              {formatNumber(visibleRepositories.length)} / {formatNumber(filteredRepositories.length)}
            </span>
          </button>
        )}
      </section>

      <section className={styles.securityNote} aria-labelledby="security-note-title">
        <div className={styles.securityIcon}>
          <ShieldIcon />
        </div>
        <div>
          <h2 id="security-note-title">공개 정보만, 서버에서 안전하게</h2>
          <p>
            GitHub의 공개 사용자 API만 사용하며 비공개 저장소, 다른 소유자의 저장소, 임의 URL은
            집계 전에 제외합니다. 선택적 GitHub 토큰도 브라우저로 전달하지 않습니다.
          </p>
        </div>
        <dl>
          <div>
            <dt>데이터 범위</dt>
            <dd>Public only</dd>
          </div>
          <div>
            <dt>자동 갱신</dt>
            <dd>최대 6시간</dd>
          </div>
        </dl>
      </section>

      <footer className={styles.footer}>
        <strong>Youngbin GitHub Command Center</strong>
        <span>·</span>
        <span>저장소 활동 표시는 마지막 push 시각을 기준으로 하며 프로젝트 상태를 추측하지 않습니다.</span>
      </footer>
    </main>
  );
}
