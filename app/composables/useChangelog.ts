import { ref } from "vue";

import changelogSource from "~~/CHANGELOG.md?raw";
import { hasUnseenRelease, parseChangelog } from "~/utils/changelog";

const SEEN_KEY = "codecraft-changelog-seen";
const releases = parseChangelog(changelogSource);
const latest = releases[0]?.version ?? "";
const unseen = ref(false);

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/** CodeCraft's release notes + whether this browser has opened the newest one. */
export function useChangelog() {
  if (import.meta.client) unseen.value = hasUnseenRelease(latest, readSeen());

  function markSeen() {
    unseen.value = false;
    try {
      localStorage.setItem(SEEN_KEY, latest);
    } catch {
      // storage blocked — the dot just shows again next time
    }
  }

  return { releases, latest, unseen, markSeen };
}
