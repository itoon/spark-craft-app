import { cancelApkBuild } from "../../../../utils/apkBuildJobs";
import { assertLocalRequest } from "../../../../utils/localOnly";

export default defineEventHandler((event) => {
  assertLocalRequest(event);
  cancelApkBuild(getRouterParam(event, "id") ?? "");
  return { ok: true };
});
