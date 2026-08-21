"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppNav.module.css";

const GITHUB_PROFILE_URL = "https://github.com/dudqks0319-cpu";

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5 12 3l8 6.5v9a2 2 0 0 1-2 2h-4v-6h-4v6H6a2 2 0 0 1-2-2v-9Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.7a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.3-.3-4.7-1.1-4.7-5a4 4 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.7 0 0 .9-.3 2.8 1a9.7 9.7 0 0 1 5.1 0c1.9-1.3 2.8-1 2.8-1 .6 1.4.2 2.4.1 2.7a4 4 0 0 1 1 2.7c0 3.9-2.4 4.7-4.7 5 .4.3.7 1 .7 2v3c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.7Z" />
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

export function AppNav() {
  const pathname = usePathname();
  const isGitHub = pathname === "/github" || pathname.startsWith("/github/");

  return (
    <header className={styles.shell}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Youngbin Life OS 홈">
          <span className={styles.brandMark}>YB</span>
          <span className={styles.brandText}>
            <strong>Youngbin OS</strong>
            <small>Personal command center</small>
          </span>
        </Link>

        <nav className={styles.navigation} aria-label="주요 화면">
          <Link
            className={styles.navItem}
            data-active={!isGitHub}
            aria-current={!isGitHub ? "page" : undefined}
            href="/"
          >
            <TodayIcon />
            <span>오늘</span>
          </Link>
          <Link
            className={styles.navItem}
            data-active={isGitHub}
            aria-current={isGitHub ? "page" : undefined}
            href="/github"
          >
            <GitHubIcon />
            <span>GitHub</span>
          </Link>
        </nav>

        <a
          className={styles.profileLink}
          href={GITHUB_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>프로필</span>
          <ExternalIcon />
        </a>
      </div>
    </header>
  );
}
