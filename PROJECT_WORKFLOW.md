# PROJECT_WORKFLOW.md

personal-ops-dashboard 프로젝트 운영 규칙

## 기본 개발 루프

1. Plan: 변경 범위/파일/영향 정리
2. Implement: 기능 구현
3. Test: lint/build/dev 동작 확인
4. Review: 실패 원인/리스크/누락 점검
5. Push: 증적 로그 남기고 커밋/푸시

---

## 테스트 체크리스트 (최소)

- `npm run lint`
- `npm run build`
- `npm run dev` 실행 후 `curl -I http://localhost:3000` 로 200 응답 확인

실패 시 반드시 기록:
- 어떤 단계에서 실패했는지
- 왜 실패했는지(쉬운 한국어)
- 임시 우회인지 근본 해결인지

---

## Push 전 증적 폴더 규칙

매 푸시 전에 아래 폴더를 생성:

`~/Desktop/github-push-reports/personal-ops-dashboard-<YYYYMMDD-HHMMSS>/`

최소 포함 파일:
- `git-diff.patch`
- `lint.log`
- `build.log`
- `dev.log`
- `dev-http-head.txt`

---

## 품질/보안 체크

- 사용자 입력 검증 여부
- 에러 메시지 과도한 내부정보 노출 여부
- 로컬 데이터/비밀정보 git 추적 제외 여부 (`.env`, `data/` 등)
- 외부 의존(폰트/API) 실패 시 graceful fallback 고려

---

## 권장 실행 명령

수동으로 할 때:

```bash
npm run lint
npm run build
npm run dev
```

워크스페이스 자동 스크립트 사용(증적 폴더 자동 생성):

```bash
~/.openclaw/workspace/scripts/make-push-report.sh ~/.openclaw/workspace/personal-ops-dashboard 3000
```

---

## 보고 형식 (짧게)

- 변경사항: 무엇을 바꿨는지
- 테스트결과: 통과/실패 + 원인
- 증적폴더: 경로
- 커밋: 해시/메시지
