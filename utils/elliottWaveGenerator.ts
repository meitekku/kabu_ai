/**
 * Elliott Wave Theory based stock price generator
 *
 * Generates realistic intermediate daily OHLCV predictions using a 5-3 wave
 * pattern with Fibonacci ratios, calibrated to each stock's historical volatility.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface DailyForecast {
  date: string;
  predictedOpen: number;
  predictedClose: number;
  predictedHigh: number;
  predictedLow: number;
  predictedVolume: number;
  reasoning: string;
}

export interface VolatilityInfo {
  avgDailyReturn: string;
  dailyVolatility: string;
  avgRange: string;
}

export interface PriceRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface WaveSegment {
  label: string;
  /** Japanese label used in reasoning */
  labelJa: string;
  /** Start price of this wave segment */
  startPrice: number;
  /** End price of this wave segment */
  endPrice: number;
  /** Number of days assigned to this wave */
  days: number;
}

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

/**
 * Simple seeded PRNG (mulberry32) for deterministic-ish but natural-looking
 * output. Seed is derived from startPrice + targetPrice so the same input
 * always produces the same wave shape, while still looking random.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return a random float in [lo, hi) using the provided RNG. */
function randBetween(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

/** Approximate normal distribution via Box-Muller. */
function randNormal(rng: () => number, mean = 0, stddev = 1): number {
  const u1 = rng() || 1e-10;
  const u2 = rng();
  return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Clamp value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Round to integer (stock prices in JPY are typically whole numbers). */
function roundPrice(v: number): number {
  return Math.round(v * 10) / 10;
}

// ── Wave construction ────────────────────────────────────────────────────────

/**
 * Build the 8 Elliott Wave segments (5 impulse + 3 corrective).
 *
 * The overall move from startPrice to targetPrice is decomposed as follows:
 *
 *   Impulse phase (Waves 1-5) covers ~100% of the move (with overshooting)
 *   Corrective phase (Waves A-C) pulls back slightly so the final price
 *   converges on targetPrice.
 *
 * Fibonacci ratios used:
 *   Wave 2 retraces 38.2-61.8% of Wave 1
 *   Wave 3 = 161.8% of Wave 1 (strongest wave)
 *   Wave 4 retraces 23.6-38.2% of Wave 3
 *   Wave 5 = 61.8-100% of Wave 1
 *   Wave A = 38.2-50% retracement of impulse
 *   Wave B = 38.2-61.8% retracement of Wave A
 *   Wave C = 61.8-100% of Wave A
 */
function buildWaveSegments(
  startPrice: number,
  targetPrice: number,
  totalDays: number,
  rng: () => number,
): WaveSegment[] {
  const isBullish = targetPrice >= startPrice;
  const direction = isBullish ? 1 : -1;
  const totalMove = Math.abs(targetPrice - startPrice);

  // If the move is extremely small (< 0.1%), just create a flat path
  if (totalMove / startPrice < 0.001) {
    return [{
      label: 'flat',
      labelJa: '横ばい推移',
      startPrice,
      endPrice: targetPrice,
      days: totalDays,
    }];
  }

  // Wave 1 magnitude (the reference unit)
  // Wave 1 is roughly 20-30% of the total move
  const wave1Mag = totalMove * randBetween(rng, 0.20, 0.30);

  // Wave 2 retracement of Wave 1
  const wave2Retrace = randBetween(rng, 0.382, 0.618);
  const wave2Mag = wave1Mag * wave2Retrace;

  // Wave 3 = 161.8% of Wave 1
  const wave3Mag = wave1Mag * randBetween(rng, 1.50, 1.80);

  // Wave 4 retracement of Wave 3
  const wave4Retrace = randBetween(rng, 0.236, 0.382);
  const wave4Mag = wave3Mag * wave4Retrace;

  // Wave 5 = 61.8-100% of Wave 1
  const wave5Mag = wave1Mag * randBetween(rng, 0.618, 1.0);

  // Impulse end price
  const impulseEnd = startPrice + direction * (wave1Mag - wave2Mag + wave3Mag - wave4Mag + wave5Mag);

  // Corrective waves: bring impulseEnd back toward targetPrice
  const correctionNeeded = impulseEnd - targetPrice; // positive means we overshot upward
  const absCorrectionNeeded = Math.abs(correctionNeeded);

  // Wave A magnitude
  const waveAMag = absCorrectionNeeded * randBetween(rng, 0.55, 0.75);
  // Wave B retracement of A
  const waveBRetrace = randBetween(rng, 0.382, 0.618);
  const waveBMag = waveAMag * waveBRetrace;
  // Wave C: whatever is left to hit targetPrice
  // We compute it so that the net correction = correctionNeeded
  const waveCMag = absCorrectionNeeded - waveAMag + waveBMag;

  const corrDir = correctionNeeded > 0 ? -1 : 1; // correction direction

  // Build price levels
  const p0 = startPrice;
  const p1 = p0 + direction * wave1Mag;
  const p2 = p1 - direction * wave2Mag;
  const p3 = p2 + direction * wave3Mag;
  const p4 = p3 - direction * wave4Mag;
  const p5 = p4 + direction * wave5Mag;
  const pA = p5 + corrDir * waveAMag;
  const pB = pA - corrDir * waveBMag;
  const pC = pB + corrDir * waveCMag;

  // Day allocation: proportional to wave magnitude, with minimums
  const magnitudes = [wave1Mag, wave2Mag, wave3Mag, wave4Mag, wave5Mag, waveAMag, waveBMag, waveCMag];
  const totalMag = magnitudes.reduce((a, b) => a + b, 0);

  // Allocate days proportionally, ensuring each wave gets at least 1 day
  let rawDays = magnitudes.map(m => Math.max(1, Math.round((m / totalMag) * totalDays)));
  let daySum = rawDays.reduce((a, b) => a + b, 0);

  // Adjust to match totalDays exactly: add/remove from Wave 3 (longest wave)
  const diff = totalDays - daySum;
  rawDays[2] = Math.max(1, rawDays[2] + diff);
  daySum = rawDays.reduce((a, b) => a + b, 0);

  // Final adjustment if still off (distribute across waves)
  if (daySum !== totalDays) {
    const remaining = totalDays - daySum;
    for (let i = 0; i < Math.abs(remaining); i++) {
      const idx = i % 8;
      rawDays[idx] += remaining > 0 ? 1 : -1;
      if (rawDays[idx] < 1) rawDays[idx] = 1;
    }
  }

  const prices = [p0, p1, p2, p3, p4, p5, pA, pB, pC];
  const labels = ['wave1', 'wave2', 'wave3', 'wave4', 'wave5', 'waveA', 'waveB', 'waveC'];
  const labelsJa = [
    isBullish ? '第1波上昇 - トレンド開始' : '第1波下落 - トレンド開始',
    isBullish ? '第2波調整 - 押し目形成' : '第2波反発 - 戻り形成',
    isBullish ? '第3波上昇 - 主要トレンド' : '第3波下落 - 主要トレンド',
    isBullish ? '第4波調整 - 一時的調整' : '第4波反発 - 一時的反発',
    isBullish ? '第5波上昇 - トレンド完成' : '第5波下落 - トレンド完成',
    '調整波A - 利益確定売り',
    '調整波B - 戻り',
    '調整波C - 調整完了',
  ];

  const segments: WaveSegment[] = [];
  for (let i = 0; i < 8; i++) {
    segments.push({
      label: labels[i],
      labelJa: labelsJa[i],
      startPrice: prices[i],
      endPrice: prices[i + 1],
      days: rawDays[i],
    });
  }

  return segments;
}

// ── Daily price generation within a wave ─────────────────────────────────────

/**
 * For each wave segment, generate daily OHLCV data that moves from the
 * segment's start price to its end price, adding intra-wave noise calibrated
 * to the stock's historical volatility.
 */
function generateDailyPrices(
  segments: WaveSegment[],
  businessDays: string[],
  volatility: VolatilityInfo,
  avgVolume: number,
  rng: () => number,
): DailyForecast[] {
  const dailyVol = parseFloat(volatility.dailyVolatility) / 100;
  const avgRange = parseFloat(volatility.avgRange) / 100;

  const result: DailyForecast[] = [];
  let dayIndex = 0;
  let prevClose = segments[0].startPrice;

  for (const seg of segments) {
    const { startPrice: segStart, endPrice: segEnd, days, labelJa, label } = seg;
    if (days <= 0) continue;

    for (let d = 0; d < days && dayIndex < businessDays.length; d++) {
      const date = businessDays[dayIndex];
      const progress = days === 1 ? 1 : d / (days - 1);

      // Base close: linear interpolation within the wave segment
      const baseClose = segStart + (segEnd - segStart) * progress;

      // Add noise proportional to historical volatility
      // Noise is smaller near wave endpoints to ensure convergence
      const edgeDamping = 1 - Math.pow(2 * progress - 1, 4); // Dampen at start/end
      const noiseScale = dailyVol * prevClose * edgeDamping * 0.5;
      const noise = randNormal(rng, 0, noiseScale);

      let close = baseClose + noise;

      // On the last day of the last segment, snap to targetPrice
      const isLastSegment = seg === segments[segments.length - 1];
      if (isLastSegment && d === days - 1) {
        close = segEnd;
      }

      // Open: gap from previous close (small random gap)
      const gapSize = randNormal(rng, 0, dailyVol * prevClose * 0.3);
      let open = prevClose + gapSize;

      // Ensure open and close are positive
      open = Math.max(open, 1);
      close = Math.max(close, 1);

      // High/Low based on historical average range
      const midPrice = (open + close) / 2;
      const rangeBase = midPrice * avgRange;
      // Add some randomness to the range
      const rangeMult = randBetween(rng, 0.6, 1.4);
      const halfRange = (rangeBase * rangeMult) / 2;

      let high = Math.max(open, close) + Math.abs(randNormal(rng, halfRange * 0.6, halfRange * 0.3));
      let low = Math.min(open, close) - Math.abs(randNormal(rng, halfRange * 0.6, halfRange * 0.3));

      // Ensure OHLC consistency
      high = Math.max(high, open, close);
      low = Math.min(low, open, close);
      low = Math.max(low, 1); // Prices can't go below 1

      // Volume: base volume with wave-specific modulation
      let volumeMult = 1.0;
      if (label === 'wave3') {
        // Wave 3 has highest volume
        volumeMult = randBetween(rng, 1.2, 1.6);
      } else if (label === 'wave5') {
        // Wave 5: declining volume (bearish divergence)
        volumeMult = randBetween(rng, 0.7, 1.0);
      } else if (label === 'wave2' || label === 'wave4') {
        // Corrective waves have lower volume
        volumeMult = randBetween(rng, 0.5, 0.8);
      } else if (label === 'waveA') {
        // Wave A can have a volume spike
        volumeMult = randBetween(rng, 0.9, 1.3);
      } else if (label === 'waveB') {
        volumeMult = randBetween(rng, 0.5, 0.7);
      } else if (label === 'waveC') {
        volumeMult = randBetween(rng, 0.8, 1.2);
      }

      // Add day-level volume noise
      const volumeNoise = randBetween(rng, 0.8, 1.2);
      // Slight declining trend overall
      const dayDecay = 1 - (dayIndex / businessDays.length) * 0.15;
      const volume = Math.round(avgVolume * volumeMult * volumeNoise * dayDecay);

      // Reasoning: wave label + short directional context
      const changePercent = ((close - prevClose) / prevClose * 100).toFixed(1);
      const changeDir = close >= prevClose ? '上昇' : '下落';
      const reasoning = `${labelJa}（前日比${changeDir}${Math.abs(parseFloat(changePercent))}%）`;

      result.push({
        date,
        predictedOpen: roundPrice(open),
        predictedClose: roundPrice(close),
        predictedHigh: roundPrice(high),
        predictedLow: roundPrice(low),
        predictedVolume: volume,
        reasoning,
      });

      prevClose = close;
      dayIndex++;
    }
  }

  // If there are remaining days (rounding issues), fill with flat movement
  while (dayIndex < businessDays.length) {
    const date = businessDays[dayIndex];
    const noise = randNormal(rng, 0, dailyVol * prevClose * 0.3);
    const close = Math.max(prevClose + noise, 1);
    const open = prevClose;
    const mid = (open + close) / 2;
    const halfRange = mid * avgRange * 0.5;
    const high = Math.max(open, close) + Math.abs(randNormal(rng, halfRange * 0.5, halfRange * 0.2));
    const low = Math.max(Math.min(open, close) - Math.abs(randNormal(rng, halfRange * 0.5, halfRange * 0.2)), 1);
    const volume = Math.round(avgVolume * randBetween(rng, 0.7, 1.0));

    result.push({
      date,
      predictedOpen: roundPrice(open),
      predictedClose: roundPrice(close),
      predictedHigh: roundPrice(high),
      predictedLow: roundPrice(low),
      predictedVolume: volume,
      reasoning: '横ばい推移',
    });

    prevClose = close;
    dayIndex++;
  }

  return result;
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Generate Elliott Wave based daily price forecasts.
 *
 * @param startPrice  - Current stock price (last close)
 * @param targetPrice - AI-predicted final price (e.g. 1 month out)
 * @param businessDays - Array of business day date strings (e.g. 20 days)
 * @param volatility  - Historical volatility metrics
 * @param recentPrices - Recent price records for pattern reference
 * @returns Array of DailyForecast objects, one per business day
 */
export function generateElliottWavePrices(
  startPrice: number,
  targetPrice: number,
  businessDays: string[],
  volatility: VolatilityInfo,
  recentPrices: PriceRecord[],
): DailyForecast[] {
  if (businessDays.length === 0) return [];

  // Derive seed from inputs for deterministic output
  const seed = Math.round(startPrice * 100) ^ Math.round(targetPrice * 100) ^ businessDays.length;
  const rng = mulberry32(seed);

  // Calculate average volume from recent prices
  const volumes = recentPrices
    .map(p => Number(p.volume))
    .filter(v => v > 0);
  const avgVolume = volumes.length > 0
    ? volumes.reduce((a, b) => a + b, 0) / volumes.length
    : 1000000;

  // Build the 5-3 wave pattern
  const segments = buildWaveSegments(startPrice, targetPrice, businessDays.length, rng);

  // Generate daily OHLCV for each wave segment
  const forecasts = generateDailyPrices(segments, businessDays, volatility, avgVolume, rng);

  // Final adjustment: ensure the last day's close is very close to targetPrice
  if (forecasts.length > 0) {
    const last = forecasts[forecasts.length - 1];
    const drift = targetPrice - last.predictedClose;

    if (Math.abs(drift) > 0.01) {
      // Smooth the drift across the last few days to avoid a sharp jump
      const adjustDays = Math.min(3, forecasts.length);
      for (let i = 0; i < adjustDays; i++) {
        const idx = forecasts.length - adjustDays + i;
        const weight = (i + 1) / adjustDays; // Increasing weight toward the end
        const adj = drift * weight / adjustDays;
        forecasts[idx].predictedClose = roundPrice(forecasts[idx].predictedClose + adj);
        forecasts[idx].predictedOpen = roundPrice(forecasts[idx].predictedOpen + adj * 0.5);
        // Re-enforce OHLC consistency
        forecasts[idx].predictedHigh = roundPrice(
          Math.max(forecasts[idx].predictedHigh, forecasts[idx].predictedOpen, forecasts[idx].predictedClose)
        );
        forecasts[idx].predictedLow = roundPrice(
          Math.min(forecasts[idx].predictedLow, forecasts[idx].predictedOpen, forecasts[idx].predictedClose)
        );
      }
      // Snap the very last close exactly
      forecasts[forecasts.length - 1].predictedClose = roundPrice(targetPrice);
      // Ensure high/low consistency on last day
      const lastForecast = forecasts[forecasts.length - 1];
      lastForecast.predictedHigh = roundPrice(
        Math.max(lastForecast.predictedHigh, lastForecast.predictedOpen, lastForecast.predictedClose)
      );
      lastForecast.predictedLow = roundPrice(
        Math.min(lastForecast.predictedLow, lastForecast.predictedOpen, lastForecast.predictedClose)
      );
    }
  }

  return forecasts;
}
