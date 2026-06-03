import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pendingFetch = new Promise<never>(() => undefined);

describe("stocks news loading alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => pendingFetch) as unknown as typeof fetch;
  });

  it("page loading skeleton matches component-level loading skeletons", async () => {
    const Loading = (await import("@/app/stocks/[code]/news/loading")).default;
    const CompanyBasicInfo = (await import("@/components/common/CompanyBasicInfo"))
      .default;
    const StockChart = (await import("@/components/parts/chart/StockChart")).default;
    const NewsList = (await import("@/components/ui/NewsList")).default;

    const { container: pageLoadingContainer } = render(<Loading />);

    const loadingCompanySkeleton = pageLoadingContainer.querySelector(
      '[data-testid="company-basic-info-skeleton"]'
    );
    const loadingChartSkeleton = pageLoadingContainer.querySelector(
      '[data-testid="stock-chart-skeleton"]'
    );
    const loadingNewsSkeleton = pageLoadingContainer.querySelector(
      '[data-testid="news-list-skeleton"]'
    );

    expect(loadingCompanySkeleton).not.toBeNull();
    expect(loadingChartSkeleton).not.toBeNull();
    expect(loadingNewsSkeleton).not.toBeNull();

    const { container: companyContainer } = render(<CompanyBasicInfo code="3103" />);
    const { container: chartContainer } = render(
      <StockChart
        code="3103"
        width="100%"
        pcHeight={{ upper: 200, lower: 100 }}
        tabletHeight={{ upper: 180, lower: 96 }}
        mobileHeight={{ upper: 120, lower: 80 }}
        maxNewsTooltips={4}
      />
    );
    const { container: newsListContainer } = render(
      <NewsList code="3103" title="最新ニュース" showMoreButton />
    );

    const companyLoadingSkeleton = companyContainer.querySelector(
      '[data-testid="company-basic-info-skeleton"]'
    );
    const chartLoadingSkeleton = chartContainer.querySelector(
      '[data-testid="stock-chart-skeleton"]'
    );
    const newsLoadingSkeleton = newsListContainer.querySelector(
      '[data-testid="news-list-skeleton"]'
    );

    expect(companyLoadingSkeleton?.outerHTML).toBe(
      loadingCompanySkeleton?.outerHTML
    );
    expect(chartLoadingSkeleton?.outerHTML).toBe(loadingChartSkeleton?.outerHTML);
    expect(newsLoadingSkeleton?.outerHTML).toBe(loadingNewsSkeleton?.outerHTML);
  });
});
