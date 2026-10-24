import { listComponentTypes } from "../../../app/utils/projectOps";
import { assertLocalRequest } from "../../utils/localOnly";

export default defineEventHandler((event) => {
  assertLocalRequest(event);
  return listComponentTypes();
});
