import { createLiveSession } from "../../utils/liveSessions";

/** Start a Live Companion session — returns the 6-character code. */
export default defineEventHandler(() => {
  const session = createLiveSession();
  return { code: session.code, version: session.version };
});
