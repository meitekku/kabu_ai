import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateMA, fetchChartAndNewsData } from '@/components/parts/chart/StockChartUtils';
import { PriceRecord } from '@/types/parts/chart/MainChart';

type MockResponseBody = {
  success: boolean;
  data?: unknown;
};

const createMockResponse = (body: MockResponseBody, ok = true): Response =>
  ({
    ok,
    json: async () => body
  }) as Response;

const createPrice = (
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
) => ({
  date,
  open,
  high,
  low,
  close,
  volume
});

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('StockChartUtils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calculateMA computes moving average with NaN warm-up period', () => {
    const data = [
      createPrice('2026-01-01', 100, 101, 99, 100, 1000),
      createPrice('2026-01-02', 100, 102, 99, 110, 1100),
      createPrice('2026-01-03', 110, 112, 108, 120, 1200),
      createPrice('2026-01-04', 120, 123, 119, 130, 1300),
      createPrice('2026-01-05', 130, 134, 128, 140, 1400)
    ];

    const ma3 = calculateMA(data as PriceRecord[], 3);

    expect(ma3).toHaveLength(5);
    expect(Number.isNaN(ma3[0])).toBe(true);
    expect(Number.isNaN(ma3[1])).toBe(true);
    expect(ma3[2]).toBeCloseTo(110, 10);
    expect(ma3[3]).toBeCloseTo(120, 10);
    expect(ma3[4]).toBeCloseTo(130, 10);
  });

  it('fetchChartAndNewsData starts chart/news requests in parallel', async () => {
    const chartDeferred = createDeferred<Response>();
    const newsDeferred = createDeferred<Response>();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(chartDeferred.promise)
      .mockReturnValueOnce(newsDeferred.promise);

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const request = fetchChartAndNewsData('7203');
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/stocks/7203/chart',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/stocks/7203/news',
      expect.objectContaining({ method: 'POST' })
    );

    chartDeferred.resolve(
      createMockResponse({
        success: true,
        data: [createPrice('2026-01-10', 100, 102, 99, 101, 1000)]
      })
    );
    newsDeferred.resolve(createMockResponse({ success: true, data: [] }));

    await expect(request).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: '01/10',
          close: 101
        })
      ])
    );
  });

  it('fetchChartAndNewsData keeps behavior while avoiding targetDate mutation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({
          success: true,
          data: [
            createPrice('2026-01-03T00:00:00.000Z', 120, 130, 115, 125, 3000),
            createPrice('2026-01-01T00:00:00.000Z', 100, 110, 95, 105, 1000),
            createPrice('2026-01-02T00:00:00.000Z', 110, 118, 108, 115, 2000)
          ]
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          success: true,
          data: [
            { id: 'old', created_at: '2026-01-02T01:00:00.000Z', title: 'old' },
            { id: 'new', created_at: '2026-01-02T12:00:00.000Z', title: 'new' }
          ]
        })
      );
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const inputDate = new Date('2026-02-15T12:00:00.000Z');
    const originalTimestamp = inputDate.getTime();
    const result = await fetchChartAndNewsData('7203', 'nikkei', inputDate);

    expect(inputDate.getTime()).toBe(originalTimestamp);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.date)).toEqual(['01/01', '01/02', '01/03']);
    expect(result[1].articles).toHaveLength(1);
    expect(result[1].articles?.[0].id).toBe('new');
    expect(Number.isNaN(result[0].ma5)).toBe(true);

    const chartPayload = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as { body?: string }).body || '{}'
    ) as { target_date?: string };
    const newsPayload = JSON.parse(
      (fetchMock.mock.calls[1]?.[1] as { body?: string }).body || '{}'
    ) as { target_date?: string };
    expect(chartPayload.target_date).toBe('2025-12-15');
    expect(newsPayload.target_date).toBe('2025-12-15');
  });
});
