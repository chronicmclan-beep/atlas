/*
  Shared company grouping for Lab variants.

  GROUPS mirrors the pickers in the production comparison builder:
  7 groups / 63 tickers. colorOf/nameOf resolve from the dataset —
  never invent a color or a name here.
*/
import { getCompany } from '../../lib/data.js'

export const GROUPS = [
  { label: 'Chip Design', tickers: ['NVDA', 'AMD', 'INTC', 'AVGO', 'MRVL', 'ARM', 'QCOM'] },
  { label: 'Semi Equipment', tickers: ['ASML', 'AMAT', 'LRCX', 'KLAC', 'TER', 'AMCR'] },
  { label: 'Memory & Storage', tickers: ['MU', 'SNDK', 'STX', 'WDC'] },
  {
    label: 'Networking & Optical',
    tickers: ['ANET', 'CRDO', 'ALAB', 'CSCO', 'HPE', 'COHR', 'LITE', 'FN', 'AAOI', 'POET', 'CIEN'],
  },
  {
    label: 'Compute & Miners',
    tickers: ['MSFT', 'AMZN', 'GOOGL', 'Meta', 'Oracle', 'CRWV', 'NBIS', 'IREN', 'WULF', 'HUT', 'GLXY', 'APLD'],
  },
  { label: 'Energy', tickers: ['VST', 'TLN', 'NRG', 'GEV', 'BE', 'PWR', 'FIX'] },
  {
    label: 'Software',
    tickers: ['PLTR', 'NOW', 'CRM', 'SNOW', 'MDB', 'DDOG', 'APP', 'TEAM', 'TWLO', 'CRWD', 'PANW', 'ZS', 'NET', 'S', 'FTNT', 'OKTA'],
  },
]

export const MAX_COMPANIES = 4

export function colorOf(ticker) {
  return getCompany(ticker)?.color ?? '#888888'
}

export function nameOf(ticker) {
  return getCompany(ticker)?.name ?? ticker
}
