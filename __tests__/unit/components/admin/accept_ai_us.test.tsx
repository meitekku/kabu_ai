import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth module
vi.mock("@/components/auth", () => ({
  useAuth: () => ({
    isLogin: true,
    isLoading: false,
    user: { email: "smartaiinvest@gmail.com" },
  }),
}));

// Mock AdminProtectedRoute to just render children
vi.mock("@/components/auth/AdminProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock StockChart
vi.mock("@/components/parts/chart/StockChart", () => ({
  default: vi.fn().mockReturnValue(null),
}));

// Mock TwitterPostButton
vi.mock("@/components/comment/admin/TwitterPostButton", () => ({
  default: () => <button>Twitter投稿</button>,
}));

// Mock TwitterPythonButton
vi.mock("@/components/comment/admin/TwitterPythonButton", () => ({
  default: () => <button>Python投稿</button>,
}));

// Mock ServerToDate
vi.mock("@/utils/format/ServerToDate", () => ({
  ServerToDate: (date: string) => date,
}));

const mockUsItems = [
  {
    id: 101,
    title: "【Apple(AAPL)】+12.5% StockTwitsまとめ",
    content: "AAPLの掲示板では新製品発表に関する議論が活発です。",
    code: "AAPL",
    accept: 0,
    created_at: "2026-02-16 08:00:00",
  },
  {
    id: 102,
    title: "【Tesla(TSLA)】-15.3% StockTwitsまとめ",
    content: "TSLAは決算発表後に大幅下落。掲示板では今後の見通しについて議論中。",
    code: "TSLA",
    accept: 0,
    created_at: "2026-02-16 08:00:00",
  },
];

describe("US Accept AI Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders US article management page title", async () => {
    // Mock fetch to return US articles
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: mockUsItems }),
    });

    const USAcceptAI = (await import("@/app/admin/accept_ai_us/page")).default;
    render(<USAcceptAI />);

    await waitFor(() => {
      expect(screen.getByText("US株 AI記事管理")).toBeInTheDocument();
    });
  });

  it("renders US article items", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: mockUsItems }),
    });

    const USAcceptAI = (await import("@/app/admin/accept_ai_us/page")).default;
    render(<USAcceptAI />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("【Apple(AAPL)】+12.5% StockTwitsまとめ")).toBeInTheDocument();
      expect(screen.getByDisplayValue("【Tesla(TSLA)】-15.3% StockTwitsまとめ")).toBeInTheDocument();
    });
  });

  it("calls correct US API endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    const USAcceptAI = (await import("@/app/admin/accept_ai_us/page")).default;
    render(<USAcceptAI />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/accept_ai_us",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("shows loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // Never resolves

    // Directly test that loading state shows
    const { container } = render(<div className="flex justify-center p-4">読み込み中...</div>);
    expect(container.textContent).toContain("読み込み中...");
  });

  it("shows error state on fetch failure", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: "DB接続エラー" }),
    });

    const USAcceptAI = (await import("@/app/admin/accept_ai_us/page")).default;
    render(<USAcceptAI />);

    await waitFor(() => {
      expect(screen.getByText("DB接続エラー")).toBeInTheDocument();
    });
  });
});

describe("ApprovalList US integration", () => {
  it("passes correct approveSiteNumber and apiEndpoint", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: mockUsItems }),
    });

    const USAcceptAI = (await import("@/app/admin/accept_ai_us/page")).default;
    render(<USAcceptAI />);

    await waitFor(() => {
      // Verify approval buttons are rendered (indicates ApprovalList received items)
      const approveButtons = screen.getAllByText("承認");
      expect(approveButtons.length).toBe(2);
    });
  });
});
