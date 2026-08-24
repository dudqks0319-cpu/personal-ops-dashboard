import { createElement, Fragment } from "react";

export function GitHubRefreshStatus({
  statusText,
  announcement,
  statusClassName,
  announcementClassName,
}: {
  statusText: string;
  announcement: string;
  statusClassName: string;
  announcementClassName: string;
}) {
  return createElement(
    Fragment,
    null,
    createElement("span", { className: statusClassName }, statusText),
    createElement(
      "span",
      {
        className: announcementClassName,
        "aria-live": "polite",
        "aria-atomic": "true",
      },
      announcement,
    ),
  );
}
