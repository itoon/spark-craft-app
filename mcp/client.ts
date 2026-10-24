export const DEFAULT_CODECRAFT_URL = "http://localhost:3000";

export class CodeCraftClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string = process.env.CODECRAFT_URL || DEFAULT_CODECRAFT_URL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    } catch {
      throw new Error(
        `ต่อ CodeCraft ที่ ${this.baseUrl} ไม่ได้ — รัน bun run dev ก่อน`,
      );
    }
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    if (!res.ok) {
      throw new Error(
        data?.statusMessage || data?.message || `HTTP ${res.status}`,
      );
    }
    return data as T;
  }
}
