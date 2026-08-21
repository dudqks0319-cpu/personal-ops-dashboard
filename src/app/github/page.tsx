import type { Metadata } from "next";
import { GitHubDashboardClient } from "./GitHubDashboardClient";
import {
  GitHubDashboardFetchError,
  getGitHubDashboardData,
} from "@/lib/githubDashboard.server";
import styles from "./github.module.css";

const GITHUB_USERNAME = "dudqks0319-cpu";

export const metadata: Metadata = {
  title: "GitHub Command Center",
  description: "공개 GitHub 저장소의 최근 활동, 언어, Stars와 프로젝트 흐름을 확인하는 개인 대시보드",
};

export const revalidate = 21_600;

export default async function GitHubDashboardPage() {
  try {
    const data = await getGitHubDashboardData(GITHUB_USERNAME);
    return <GitHubDashboardClient data={data} />;
  } catch (error) {
    const message =
      error instanceof GitHubDashboardFetchError
        ? error.message
        : "GitHub 대시보드를 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.";

    return (
      <main className={styles.errorPage}>
        <section className={styles.errorCard} role="alert">
          <span className={styles.errorMark} aria-hidden="true">
            !
          </span>
          <div>
            <h1>GitHub 데이터를 불러오지 못했습니다.</h1>
            <p>{message}</p>
            <small>기존 Life OS와 브라우저에 저장된 개인 데이터에는 영향이 없습니다.</small>
          </div>
          <a href="/github">다시 시도</a>
        </section>
      </main>
    );
  }
}
