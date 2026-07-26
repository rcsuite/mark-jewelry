/**
 * Silver market data for the admin hub.
 * Uses COMEX silver futures (SI=F) — the series Mark asked to chart —
 * via Yahoo Finance chart API (no third-party key required).
 * Cached ~1 hour so opening the PWA stays snappy.
 */

export type SilverHistoryPoint = {
  date: string
  price: number
}

export type SilverQuote = {
  symbol: string
  label: string
  currency: string
  /** USD per troy ounce */
  pricePerOz: number
  previousClose: number | null
  change: number | null
  changePercent: number | null
  asOf: string | null
  history: SilverHistoryPoint[]
  source: string
}

const YAHOO_CHART =
  'https://query1.finance.yahoo.com/v8/finance/chart/SI=F?range=1mo&interval=1d&includePrePost=false'

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string
        symbol?: string
        regularMarketPrice?: number
        chartPreviousClose?: number
        regularMarketTime?: number
        shortName?: string
      }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
        }>
        adjclose?: Array<{
          adjclose?: Array<number | null>
        }>
      }
    }>
    error?: unknown
  }
}

function formatIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}

export async function getSilverQuote(): Promise<SilverQuote | null> {
  try {
    const res = await fetch(YAHOO_CHART, {
      next: { revalidate: 3600 },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'EarthenMinersDesignsAdmin/1.0',
      },
    })

    if (!res.ok) {
      console.error('getSilverQuote: HTTP', res.status)
      return null
    }

    const data = (await res.json()) as YahooChartResponse
    const result = data.chart?.result?.[0]
    if (!result?.meta?.regularMarketPrice) {
      console.error('getSilverQuote: unexpected payload')
      return null
    }

    const meta = result.meta
    const pricePerOz = Number(meta.regularMarketPrice)
    const previousClose =
      typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : null
    const change = previousClose !== null ? pricePerOz - previousClose : null
    const changePercent =
      change !== null && previousClose ? (change / previousClose) * 100 : null

    const closes =
      result.indicators?.adjclose?.[0]?.adjclose ??
      result.indicators?.quote?.[0]?.close ??
      []
    const timestamps = result.timestamp ?? []
    const history: SilverHistoryPoint[] = []

    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i]
      if (typeof close !== 'number' || !Number.isFinite(close)) continue
      history.push({
        date: formatIsoDate(timestamps[i]),
        price: close,
      })
    }

    return {
      symbol: meta.symbol ?? 'SI=F',
      label: meta.shortName ?? 'Silver futures',
      currency: meta.currency ?? 'USD',
      pricePerOz,
      previousClose,
      change,
      changePercent,
      asOf:
        typeof meta.regularMarketTime === 'number'
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : null,
      history,
      source: 'Yahoo Finance · COMEX SI=F',
    }
  } catch (err) {
    console.error('getSilverQuote:', err)
    return null
  }
}

export function formatUsdPerOz(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value)
}

/** Spot $/oz only — shared by storefront price hydration. */
export async function getSilverSpotPerOz(): Promise<number | null> {
  const quote = await getSilverQuote()
  return quote?.pricePerOz ?? null
}
