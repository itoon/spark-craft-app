import { afterEach, describe, expect, it } from "vitest";
import type { H3Event } from "h3";

import { isLocalRequest } from "../../server/utils/localOnly";

function request(remoteAddress: string | undefined, headers: Record<string, string> = {}) {
  return { node: { req: { socket: { remoteAddress }, headers } } } as unknown as H3Event;
}

const TOKEN = "s3cret";

describe("isLocalRequest", () => {
  afterEach(() => {
    delete process.env.CODECRAFT_CLIENT_STAMP;
  });

  it("uses the socket address when there is one", () => {
    expect(isLocalRequest(request("127.0.0.1"))).toBe(true);
    expect(isLocalRequest(request("::ffff:127.0.0.1"))).toBe(true);
    expect(isLocalRequest(request("10.9.9.9"))).toBe(false);
  });

  it("ignores x-forwarded-for, which the client can fake", () => {
    expect(isLocalRequest(request(undefined, { "x-forwarded-for": "127.0.0.1" }))).toBe(false);
  });

  it("in nuxt dev trusts only the outer server's stamp with this process's secret", () => {
    process.env.CODECRAFT_CLIENT_STAMP = TOKEN;
    expect(isLocalRequest(request(undefined, { "x-codecraft-client": `${TOKEN} ::1` }))).toBe(true);
    expect(isLocalRequest(request(undefined, { "x-codecraft-client": `${TOKEN} 10.9.9.9` }))).toBe(false);
    expect(isLocalRequest(request(undefined, { "x-codecraft-client": "guess 127.0.0.1" }))).toBe(false);
  });

  it("ignores a stamp when the socket address is known (production)", () => {
    process.env.CODECRAFT_CLIENT_STAMP = TOKEN;
    expect(isLocalRequest(request("10.9.9.9", { "x-codecraft-client": `${TOKEN} 127.0.0.1` }))).toBe(false);
  });
});
