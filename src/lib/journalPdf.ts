import type { Category, Transaction } from '@/types';
import { formatCurrency, formatDate, formatDateLong, formatTime } from '@/lib/format';
import { isTaxFreeItem, getTaxByRate } from '@/lib/tax';

interface ExportData {
  headerLabel: string;
  location: string;
  transactions: Transaction[];
  categories: Category[];
  stats: {
    total: number;
    taxByRate: Record<number, number>;
    count: number;
    totalNet: number;
    totalTax: number;
    totalPfand: number;
  };
  groupMode: string;
}

export function generateJournalPDF(data: ExportData) {
  const { headerLabel, location, transactions, categories, stats, groupMode } = data;

  // Category breakdown
  const catMap = new Map<string, { name: string; total: number; count: number; pfand: number }>();
  for (const tx of transactions) {
    for (const item of tx.items) {
      const isPfand = isTaxFreeItem(item);
      const cat = categories.find((c) => c.id === item.categoryId);
      const key = isPfand ? '__pfand__' : item.categoryId;
      if (!catMap.has(key)) catMap.set(key, { name: isPfand ? 'Pfand' : cat?.name ?? 'Unbekannt', total: 0, count: 0, pfand: 0 });
      const g = catMap.get(key)!;
      g.total += item.price * item.quantity;
      g.count += item.quantity;
      g.pfand += item.pfand;
    }
  }
  const catRows = [...catMap.values()].sort((a, b) => b.total - a.total)
    .map((g) => `<tr><td>${g.name}</td><td style="text-align:right">${g.count}</td><td style="text-align:right">${formatCurrency(g.pfand)}</td><td style="text-align:right"><b>${formatCurrency(g.total)}</b></td></tr>`)
    .join('');

  // Article breakdown
  const artMap = new Map<string, { name: string; count: number; total: number; taxRate: number }>();
  for (const tx of transactions) {
    for (const item of tx.items) {
      const key = `${item.productId}-${item.name}`;
      const isTaxFree = isTaxFreeItem(item);
      if (!artMap.has(key)) artMap.set(key, { name: item.name, count: 0, total: 0, taxRate: isTaxFree ? 0 : item.taxRate });
      const g = artMap.get(key)!;
      g.count += item.quantity;
      g.total += item.price * item.quantity;
    }
  }
  const artRows = [...artMap.values()].sort((a, b) => b.total - a.total)
    .map((g) => `<tr><td>${g.name}</td><td style="text-align:right">${g.taxRate === 0 ? 'steuerfrei' : `${g.taxRate}%`}</td><td style="text-align:right">${g.count}</td><td style="text-align:right"><b>${formatCurrency(g.total)}</b></td></tr>`)
    .join('');

  // Tax breakdown — by actual rate, dynamic
  const taxData = new Map<number, { gross: number; net: number; tax: number; count: number }>();
  for (const tx of transactions) {
    for (const item of tx.items) {
      if (isTaxFreeItem(item)) continue;
      const rate = item.taxRate;
      const gross = item.price * item.quantity;
      const net = item.netPrice;
      const tax = item.taxAmount;
      const g = taxData.get(rate) ?? { gross: 0, net: 0, tax: 0, count: 0 };
      g.gross += gross; g.net += net; g.tax += tax; g.count += item.quantity;
      taxData.set(rate, g);
    }
  }
  const sortedRates = [...taxData.keys()].sort((a, b) => a - b);
  const taxCards = sortedRates.map((rate) => {
    const d = taxData.get(rate)!;
    return `<div class="tax-card"><h3>MwSt ${rate}%</h3>
      <div class="row"><span>Bruttoumsatz</span><span>${formatCurrency(d.gross)}</span></div>
      <div class="row"><span>Nettoumsatz</span><span>${formatCurrency(d.net)}</span></div>
      <div class="row bold"><span>MwSt-Anteil</span><span>${formatCurrency(d.tax)}</span></div>
      <div class="row"><span>Verkaufte Menge</span><span>${d.count}</span></div></div>`;
  }).join('');

  const taxColumns = sortedRates.length > 0 ? sortedRates.length : 2;

  // Transaction list
  const txRows = [...transactions].sort((a, b) => a.timestamp - b.timestamp)
    .map((tx, i) => {
      const txTax = [...getTaxByRate(tx).values()].reduce((s, v) => s + v, 0);
      return `<tr><td>${i + 1}</td><td>${formatDate(tx.timestamp)} ${formatTime(tx.timestamp)}</td><td>${tx.items.length}</td><td style="text-align:right">${formatCurrency(tx.total)}</td><td style="text-align:right">${formatCurrency(txTax)}</td><td>${tx.paymentMethod === 'cash' ? 'BAR' : 'KARTE'}</td></tr>`;
    })
    .join('');

  // Bestseller
  const bestRows = [...artMap.values()].sort((a, b) => b.count - a.count).slice(0, 10)
    .map((g, i) => `<tr><td>${i + 1}</td><td>${g.name}</td><td style="text-align:right">${g.count}</td><td style="text-align:right"><b>${formatCurrency(g.total)}</b></td></tr>`)
    .join('');

  const generatedAt = new Date().toLocaleString('de-DE');
  const taxSummaryLine = sortedRates.length > 0
    ? sortedRates.map((r) => `MwSt ${r}%: ${formatCurrency(stats.taxByRate[r] ?? 0)}`).join(' · ')
    : '—';

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
  <title>${headerLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; }
    .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #2563eb; }
    .header h1 { font-size: 24px; color: #1e3a5f; margin-bottom: 4px; }
    .header .meta { font-size: 12px; color: #666; }
    h2 { font-size: 15px; margin-top: 24px; margin-bottom: 10px; color: #1e3a5f; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: bold; color: #1e3a5f; }
    .summary-card.accent .value { color: #2563eb; }
    .summary-card.pfand .value { color: #0d9488; }
    .summary-card.count .value { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
    th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #333; color: #333; font-size: 10px; text-transform: uppercase; }
    td { padding: 4px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background: #fafafa; }
    .tax-section { display: grid; gap: 16px; margin-bottom: 16px; }
    .tax-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .tax-card h3 { font-size: 13px; margin-bottom: 8px; }
    .tax-card .row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
    .tax-card .row.bold { font-weight: bold; border-top: 1px solid #ccc; margin-top: 6px; padding-top: 6px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 10px; color: #999; text-align: center; }
    .badge { display: inline-block; background: #2563eb; color: white; font-size: 10px; padding: 2px 8px; border-radius: 12px; margin-left: 8px; }
    @media print { body { padding: 20px; } .summary-grid { grid-template-columns: repeat(6, 1fr); } }
  </style></head><body>
  <div class="header">
    <h1>Kassenjournal</h1>
    <div class="meta">${headerLabel}${location ? ` | Standort: ${location}` : ''} | Erstellt: ${generatedAt}</div>
  </div>

  <h2>Zusammenfassung</h2>
  <div class="summary-grid">
    <div class="summary-card accent"><div class="label">Umsatz (inkl. MwSt.)</div><div class="value">${formatCurrency(stats.total)}</div></div>
    <div class="summary-card"><div class="label">Netto</div><div class="value">${formatCurrency(stats.totalNet)}</div></div>
    <div class="summary-card"><div class="label">MwSt gesamt</div><div class="value">${formatCurrency(stats.totalTax)}</div></div>
    <div class="summary-card pfand"><div class="label">Pfand</div><div class="value">${formatCurrency(stats.totalPfand)}</div></div>
    <div class="summary-card count"><div class="label">Verkäufe</div><div class="value">${stats.count}</div></div>
    <div class="summary-card"><div class="label">MwSt nach Satz</div><div class="value" style="font-size:11px">${taxSummaryLine}</div></div>
  </div>

  <h2>Mehrwertsteuer-Klassen</h2>
  <div class="tax-section" style="grid-template-columns: repeat(${Math.min(taxColumns, 4)}, 1fr)">
    ${taxCards || '<div class="tax-card">Keine steuerpflichtigen Umsätze</div>'}
  </div>

  <h2>Warengruppen</h2>
  <table><thead><tr><th>Gruppe</th><th style="text-align:right">Menge</th><th style="text-align:right">Pfand</th><th style="text-align:right">Umsatz</th></tr></thead><tbody>${catRows}</tbody></table>

  <h2>Einzelartikel</h2>
  <table><thead><tr><th>Artikel</th><th style="text-align:right">MwSt</th><th style="text-align:right">Menge</th><th style="text-align:right">Umsatz</th></tr></thead><tbody>${artRows}</tbody></table>

  <h2>Bestseller (Top 10)</h2>
  <table><thead><tr><th>#</th><th>Artikel</th><th style="text-align:right">Menge</th><th style="text-align:right">Umsatz</th></tr></thead><tbody>${bestRows}</tbody></table>

  <h2>Einzel-Bons (${transactions.length})</h2>
  <table><thead><tr><th>#</th><th>Datum/Zeit</th><th>Artikel</th><th style="text-align:right">Betrag</th><th style="text-align:right">MwSt</th><th>Zahlart</th></tr></thead><tbody>${txRows}</tbody></table>

  <div class="footer">Kassenjournal automatisch generiert | ${generatedAt}</div>
  </body></html>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Druckvorschau Kassenjournal');
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.border = '0';
  frame.onload = () => {
    const cw = frame.contentWindow;
    if (!cw) return;
    let removed = false;
    const cleanup = () => {
      if (removed) return;
      removed = true;
      try { frame.remove(); } catch { /* already gone */ }
    };
    cw.addEventListener('afterprint', cleanup);
    cw.focus();
    cw.print();
    window.setTimeout(cleanup, 120000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}
