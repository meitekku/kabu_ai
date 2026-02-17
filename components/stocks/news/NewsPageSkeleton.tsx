type ChartHeight = {
  upper: number;
  lower: number;
};

type StockChartSkeletonProps = {
  width?: string | number;
  pcHeight?: ChartHeight;
  tabletHeight?: ChartHeight;
  mobileHeight?: ChartHeight;
};

type NewsListSkeletonProps = {
  title?: string;
  h3Title?: string;
  rowCount?: number;
  showMoreButton?: boolean;
};

type NewsPageSkeletonProps = {
  title?: string;
  h3Title?: string;
  showMoreButton?: boolean;
  showAiFeatureNav?: boolean;
  newsRowCount?: number;
  chartWidth?: string | number;
  chartPcHeight?: ChartHeight;
  chartTabletHeight?: ChartHeight;
  chartMobileHeight?: ChartHeight;
};

const DEFAULT_PC_CHART_HEIGHT: ChartHeight = { upper: 200, lower: 100 };
const DEFAULT_MOBILE_CHART_HEIGHT: ChartHeight = { upper: 120, lower: 80 };

const resolveTabletHeight = (
  pcHeight: ChartHeight,
  mobileHeight: ChartHeight,
  tabletHeight?: ChartHeight
) => {
  if (tabletHeight) {
    return tabletHeight;
  }

  return {
    upper: Math.round((pcHeight.upper + mobileHeight.upper) / 2),
    lower: Math.round((pcHeight.lower + mobileHeight.lower) / 2),
  };
};

const toCssWidth = (width: string | number) =>
  typeof width === 'number' ? `${width}px` : width;

export const CompanyBasicInfoSkeleton = () => {
  const summaryItems = [0, 1, 2, 3];

  return (
    <div
      data-testid="company-basic-info-skeleton"
      className="w-full bg-white px-2 min-h-[90px]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-12 rounded bg-gray-200" />
          <div className="h-6 w-32 rounded bg-gray-200" />
        </div>
        <div className="h-4 w-12 rounded bg-gray-200" />
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <div className="flex items-baseline space-x-4">
          <div className="h-8 w-24 rounded bg-gray-200" />
          <div className="h-6 w-36 rounded bg-gray-200" />
        </div>
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>
      <div className="mt-2 grid grid-cols-4 text-sm">
        {summaryItems.map((index) => (
          <div key={index}>
            <div className="mb-1 h-4 w-10 rounded bg-gray-200" />
            <div className="h-4 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const StockChartSkeleton = ({
  width = '100%',
  pcHeight = DEFAULT_PC_CHART_HEIGHT,
  tabletHeight,
  mobileHeight = DEFAULT_MOBILE_CHART_HEIGHT,
}: StockChartSkeletonProps) => {
  const resolvedTabletHeight = resolveTabletHeight(
    pcHeight,
    mobileHeight,
    tabletHeight
  );

  return (
    <div
      data-testid="stock-chart-skeleton"
      className="mt-2"
      style={{ width: toCssWidth(width) }}
    >
      <div
        className="h-full rounded bg-gray-200 sm:hidden"
        style={{ height: `${mobileHeight.upper}px` }}
      />
      <div
        className="hidden h-full rounded bg-gray-200 sm:block lg:hidden"
        style={{ height: `${resolvedTabletHeight.upper}px` }}
      />
      <div
        className="hidden h-full rounded bg-gray-200 lg:block"
        style={{ height: `${pcHeight.upper}px` }}
      />

      <div
        className="mt-2 h-full rounded bg-gray-200 sm:hidden"
        style={{ height: `${mobileHeight.lower}px` }}
      />
      <div
        className="mt-2 hidden h-full rounded bg-gray-200 sm:block lg:hidden"
        style={{ height: `${resolvedTabletHeight.lower}px` }}
      />
      <div
        className="mt-2 hidden h-full rounded bg-gray-200 lg:block"
        style={{ height: `${pcHeight.lower}px` }}
      />
    </div>
  );
};

export const AiFeatureNavSkeleton = () => {
  return (
    <div data-testid="ai-feature-nav-skeleton" className="my-2 mx-auto max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-gray-50/70 p-4 pt-0 shadow-sm">
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gray-200" />
        <div className="flex items-center justify-center gap-1.5 pt-4 pb-1">
          <div className="h-3.5 w-3.5 rounded-full bg-gray-200" />
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="h-3.5 w-3.5 rounded-full bg-gray-200" />
        </div>
        <div className="flex gap-3 pt-2">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="flex-1 rounded-xl border border-gray-200 p-4"
            >
              <div className="mx-auto h-10 w-10 rounded-full bg-gray-200" />
              <div className="mx-auto mt-3 h-4 w-20 rounded bg-gray-200" />
              <div className="mx-auto mt-2 h-3 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const NewsListSkeleton = ({
  title,
  h3Title,
  rowCount = 10,
  showMoreButton = false,
}: NewsListSkeletonProps) => {
  const rows = Array.from({ length: rowCount }, (_, index) => index);

  return (
    <div data-testid="news-list-skeleton">
      {h3Title && <div className="mb-4 h-7 w-48 rounded bg-gray-200" />}
      {title && <div className="mt-4 mb-2 h-7 w-32 rounded bg-gray-200" />}

      <div className="divide-y divide-gray-100">
        {rows.map((index) => (
          <div
            key={index}
            className="rounded-lg bg-card text-card-foreground border-0 shadow-none"
          >
            <div className="py-1 px-0 sm:py-3 sm:px-2">
              <div className="mb-1 flex items-center gap-2">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-4 w-14 rounded bg-gray-200" />
              </div>
              <div className="mt-0.5 h-5 w-full rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      {showMoreButton && (
        <div className="text-right">
          <div className="ml-auto h-4 w-20 rounded bg-gray-200" />
        </div>
      )}
    </div>
  );
};

export const NewsPageSkeleton = ({
  title = '最新ニュース',
  h3Title,
  showMoreButton = true,
  showAiFeatureNav = true,
  newsRowCount = 10,
  chartWidth = '100%',
  chartPcHeight = DEFAULT_PC_CHART_HEIGHT,
  chartTabletHeight,
  chartMobileHeight = DEFAULT_MOBILE_CHART_HEIGHT,
}: NewsPageSkeletonProps) => {
  return (
    <div className="animate-pulse">
      <CompanyBasicInfoSkeleton />
      <StockChartSkeleton
        width={chartWidth}
        pcHeight={chartPcHeight}
        tabletHeight={chartTabletHeight}
        mobileHeight={chartMobileHeight}
      />
      {showAiFeatureNav && <AiFeatureNavSkeleton />}
      <NewsListSkeleton
        title={title}
        h3Title={h3Title}
        rowCount={newsRowCount}
        showMoreButton={showMoreButton}
      />
    </div>
  );
};
