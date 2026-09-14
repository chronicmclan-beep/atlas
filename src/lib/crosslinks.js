import { findCompany, kpisByTicker, supplyParticipants, financingParticipants } from './data.js'

/*
  Cross-link registry. Given a company reference (ticker, name, or alias),
  returns the sections that can focus that company — its KPI card, its
  supply-chain node, and/or its financing node — in canonical order. A company
  with no data-backed destination (e.g. an upstream supplier not modelled
  elsewhere) returns an empty list, so callers render it as plain text.
*/
export function companyDestinations(tickerOrName) {
  const company = findCompany(tickerOrName)
  if (!company) return []
  const t = company.ticker
  const dests = []
  if (kpisByTicker[t]) dests.push({ sectionId: 'kpis', label: 'Company KPIs' })
  if (supplyParticipants.has(t)) dests.push({ sectionId: 'supply-chain', label: 'Supply chain' })
  if (financingParticipants.has(t)) dests.push({ sectionId: 'financing', label: 'Financing web' })
  return dests
}
