import { beforeEach, describe, it, expect, vi } from "vitest";

type DbSelectFn = (
  query: string,
  params?: Array<string | number | boolean | null>
) => Promise<unknown[]>;
type DbInsertFn = (
  query: string,
  params?: Array<string | number | boolean | null>
) => Promise<number>;
type DbDeleteFn = (
  query: string,
  params?: Array<string | number | boolean | null>
) => Promise<number>;

const { mockSelect, mockInsert, mockDelete } = vi.hoisted(() => ({
  mockSelect: vi.fn<DbSelectFn>(),
  mockInsert: vi.fn<DbInsertFn>(),
  mockDelete: vi.fn<DbDeleteFn>(),
}));

vi.mock("@/lib/database/Mysql", () => ({
  Database: {
    getInstance: () => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    }),
  },
}));

import {
  ruleBasedParse,
  handleLineMessage,
} from "@/lib/line/favorites-handler";

// Helper to create a mock LLM response
function makeLlmResponse(content: string) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// Helper to set up DB mocks for a premium user with LINE link
function setupPremiumUser() {
  mockSelect.mockImplementation((query: string) => {
    if (query.includes("FROM user_line_link")) {
      return Promise.resolve([{ user_id: "user-1" }]);
    }
    if (query.includes("FROM user WHERE id")) {
      return Promise.resolve([
        { subscription_status: "active", createdAt: new Date("2025-01-01") },
      ]);
    }
    return Promise.resolve([]);
  });
}

describe("ruleBasedParse", () => {
  describe("add intent", () => {
    it("should detect add intent with company name", () => {
      const result = ruleBasedParse("トヨタを追加");
      expect(result.action).toBe("add");
      expect(result.stockNames).toContain("トヨタ");
      expect(result.rawQuery).toBe("トヨタを追加");
    });

    it("should detect add intent with stock code", () => {
      const result = ruleBasedParse("7203を登録");
      expect(result.action).toBe("add");
      expect(result.stockCodes).toContain("7203");
      expect(result.rawQuery).toBe("7203を登録");
    });

    it("should detect add intent with both code and name", () => {
      const result = ruleBasedParse("7203トヨタを追加");
      expect(result.action).toBe("add");
      expect(result.stockCodes).toContain("7203");
      expect(result.stockNames).toBeDefined();
      expect(result.stockNames!.length).toBeGreaterThan(0);
    });
  });

  describe("remove intent", () => {
    it("should detect remove intent with company name", () => {
      const result = ruleBasedParse("トヨタを削除");
      expect(result.action).toBe("remove");
      expect(result.stockNames).toContain("トヨタ");
      expect(result.rawQuery).toBe("トヨタを削除");
    });

    it("should detect remove intent with 解除 keyword", () => {
      const result = ruleBasedParse("7203を解除");
      expect(result.action).toBe("remove");
      expect(result.stockCodes).toContain("7203");
    });
  });

  describe("list intent", () => {
    it("should detect list intent with 一覧", () => {
      const result = ruleBasedParse("一覧");
      expect(result.action).toBe("list");
      expect(result.rawQuery).toBe("一覧");
    });

    it("should detect list intent with リスト", () => {
      const result = ruleBasedParse("リスト");
      expect(result.action).toBe("list");
      expect(result.rawQuery).toBe("リスト");
    });

    it("should detect list intent with お気に入り", () => {
      const result = ruleBasedParse("お気に入り");
      expect(result.action).toBe("list");
      expect(result.rawQuery).toBe("お気に入り");
    });

    it("should detect list intent with 確認", () => {
      const result = ruleBasedParse("確認");
      expect(result.action).toBe("list");
      expect(result.rawQuery).toBe("確認");
    });
  });

  describe("help intent", () => {
    it("should detect help intent with ヘルプ", () => {
      const result = ruleBasedParse("ヘルプ");
      expect(result.action).toBe("help");
      expect(result.rawQuery).toBe("ヘルプ");
    });

    it("should detect help intent with 使い方", () => {
      const result = ruleBasedParse("使い方");
      expect(result.action).toBe("help");
    });
  });

  describe("info intent", () => {
    it("should detect info intent with 情報 keyword", () => {
      const result = ruleBasedParse("トヨタの情報");
      expect(result.action).toBe("info");
      expect(result.stockNames).toBeDefined();
      expect(result.stockNames!.length).toBeGreaterThan(0);
      expect(result.rawQuery).toBe("トヨタの情報");
    });

    it("should detect info intent with について keyword", () => {
      const result = ruleBasedParse("7203について");
      expect(result.action).toBe("info");
      expect(result.stockCodes).toContain("7203");
      expect(result.rawQuery).toBe("7203について");
    });
  });

  describe("unknown intent", () => {
    it("should return unknown for unrecognized messages", () => {
      const result = ruleBasedParse("こんにちは");
      expect(result.action).toBe("unknown");
      expect(result.rawQuery).toBe("こんにちは");
    });

    it("should not include stockCodes when no 4-digit numbers present", () => {
      const result = ruleBasedParse("こんにちは");
      expect(result.stockCodes).toBeUndefined();
    });

    it("should not include stockNames for unknown intent", () => {
      const result = ruleBasedParse("こんにちは");
      expect(result.stockNames).toBeUndefined();
    });
  });

  describe("stock code extraction", () => {
    it("should extract 4-digit stock codes from message", () => {
      const result = ruleBasedParse("7203を追加");
      expect(result.stockCodes).toEqual(["7203"]);
    });

    it("should not include stockCodes property when no codes found", () => {
      const result = ruleBasedParse("トヨタを追加");
      expect(result.stockCodes).toBeUndefined();
    });
  });

  describe("stock name extraction", () => {
    it("should extract cleaned company name for add action", () => {
      const result = ruleBasedParse("ソニーを追加");
      expect(result.action).toBe("add");
      expect(result.stockNames).toContain("ソニー");
    });

    it("should not include stockNames property when name is empty after cleaning", () => {
      const result = ruleBasedParse("7203を追加");
      expect(result.stockNames).toBeUndefined();
    });
  });
});

describe("parseUserIntent (via handleLineMessage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("should use LLM response when API returns valid JSON", async () => {
    mockSelect.mockImplementation((query: string) => {
      if (query.includes("FROM user_line_link")) {
        return Promise.resolve([{ user_id: "user-1" }]);
      }
      if (query.includes("FROM user WHERE id")) {
        return Promise.resolve([
          { subscription_status: "active", createdAt: new Date("2025-01-01") },
        ]);
      }
      if (query.includes("SELECT code, name FROM company WHERE code")) {
        return Promise.resolve([{ code: "7203", name: "トヨタ自動車" }]);
      }
      if (query.includes("SELECT COUNT(*) as count FROM user_favorite")) {
        return Promise.resolve([{ count: 0 }]);
      }
      return Promise.resolve([]);
    });
    mockInsert.mockResolvedValue(1);

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        makeLlmResponse(
          '{"action":"add","stockCodes":["7203"],"stockNames":["トヨタ自動車"]}'
        )
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleLineMessage("line-user-1", "トヨタを追加して");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toContain("トヨタ自動車");
    expect(result).toContain("7203");

    vi.unstubAllGlobals();
  });

  it("should fall back to ruleBasedParse when LLM returns non-JSON", async () => {
    setupPremiumUser();

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        makeLlmResponse("すみません、よく分かりません。")
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleLineMessage("line-user-1", "ヘルプ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toContain("株AI LINE Bot");

    vi.unstubAllGlobals();
  });

  it("should fall back to ruleBasedParse when LLM returns HTTP error", async () => {
    setupPremiumUser();

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response("Internal Server Error", { status: 500 })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleLineMessage("line-user-1", "ヘルプ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toContain("株AI LINE Bot");

    vi.unstubAllGlobals();
  });

  it("should fall back to ruleBasedParse on network error", async () => {
    setupPremiumUser();

    const fetchMock = vi.fn(() =>
      Promise.reject(new Error("Network error"))
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleLineMessage("line-user-1", "ヘルプ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toContain("株AI LINE Bot");

    vi.unstubAllGlobals();
  });

  it("should fall back to ruleBasedParse on abort/timeout", async () => {
    setupPremiumUser();

    const fetchMock = vi.fn(() =>
      Promise.reject(
        new DOMException("The operation was aborted", "AbortError")
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleLineMessage("line-user-1", "ヘルプ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toContain("株AI LINE Bot");

    vi.unstubAllGlobals();
  });

  it("should fall back when LLM returns invalid action", async () => {
    setupPremiumUser();

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        makeLlmResponse('{"action":"invalid_action","stockCodes":["7203"]}')
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    // ruleBasedParse("一覧") -> list -> empty favorites
    const result = await handleLineMessage("line-user-1", "一覧");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toContain("お気に入り銘柄はまだ登録されていません");

    vi.unstubAllGlobals();
  });

  it("should handle LLM response wrapped in markdown code block", async () => {
    setupPremiumUser();

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        makeLlmResponse('```json\n{"action":"help"}\n```')
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await handleLineMessage("line-user-1", "何かメッセージ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toContain("株AI LINE Bot");

    vi.unstubAllGlobals();
  });

  it("should send correct request body to LLM API", async () => {
    setupPremiumUser();

    const fetchMock = vi.fn(() =>
      Promise.resolve(makeLlmResponse('{"action":"help"}'))
    );
    vi.stubGlobal("fetch", fetchMock);

    await handleLineMessage("line-user-1", "テストメッセージ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/v1/chat/completions");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.model).toBe("JunHowie/Qwen3-14B-GPTQ-Int4");
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(200);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toBe("テストメッセージ");
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });

    vi.unstubAllGlobals();
  });
});
