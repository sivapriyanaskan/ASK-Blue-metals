// Shared CSV download + browser print helpers for report pages.
// Exports use the rows passed in (caller passes the already-filtered list),
// so download/print always reflects what the user sees on screen.

export type ReportColumn<T> = {
  header: string;
  /** Value used for CSV / print cell. Number returns are right-aligned and locale-formatted in print. */
  value: (row: T) => string | number | null | undefined;
  /** Optional alignment hint for print HTML; CSV ignores it. */
  align?: 'left' | 'right' | 'center';
};

export type ReportMeta<T = unknown> = {
  title: string;
  /** Optional subtitle lines (e.g. date range, filters) shown above the print table. */
  subtitle?: string[];
  /** Optional totals row appended below the table — array length must match columns. */
  totals?: (string | number | null | undefined)[];
  /** Optional grouping. When provided, rows are grouped by the returned key and a header row
   *  ("<groupLabel> : <key>") is rendered above each group's rows. */
  groupBy?: (row: T) => string;
  /** Label shown before the group key in the header row. Defaults to "Group". */
  groupLabel?: string;
};

const csvEscape = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

function groupRows<T>(rows: T[], keyOf: (r: T) => string): { key: string; rows: T[] }[] {
  const map = new Map<string, T[]>();
  const order: string[] = [];
  for (const r of rows) {
    const k = keyOf(r) || '—';
    if (!map.has(k)) { map.set(k, []); order.push(k); }
    map.get(k)!.push(r);
  }
  return order.map(k => ({ key: k, rows: map.get(k)! }));
}

const sanitiseFileName = (s: string) =>
  s.replace(/[^a-z0-9-_]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'report';

const todayStamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
};

export function downloadReportCSV<T>(
  rows: T[],
  columns: ReportColumn<T>[],
  meta: ReportMeta<T>,
): void {
  const lines: string[] = [];
  lines.push(csvEscape(meta.title));
  if (meta.subtitle?.length) {
    for (const s of meta.subtitle) lines.push(csvEscape(s));
  }
  lines.push('');
  lines.push(columns.map(c => csvEscape(c.header)).join(','));
  const label = meta.groupLabel ?? 'Group';
  const groups = meta.groupBy ? groupRows(rows, meta.groupBy) : [{ key: '', rows }];
  for (const g of groups) {
    if (meta.groupBy) {
      lines.push('');
      lines.push(csvEscape(`${label} : ${g.key}`));
    }
    for (const row of g.rows) {
      lines.push(columns.map(c => csvEscape(c.value(row))).join(','));
    }
  }
  if (meta.totals?.length) {
    lines.push(meta.totals.map(csvEscape).join(','));
  }
  const csv = '\uFEFF' + lines.join('\r\n'); // BOM so Excel detects UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitiseFileName(meta.title)}_${todayStamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function printReport<T>(
  rows: T[],
  columns: ReportColumn<T>[],
  meta: ReportMeta<T>,
): void {
  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups to print this report.');
    return;
  }
  const headHtml = columns
    .map(c => `<th style="text-align:${c.align ?? 'left'}">${escapeHtml(c.header)}</th>`)
    .join('');
  const renderRow = (r: T) => {
    const cells = columns
      .map(c => {
        const v = c.value(r);
        const text = v === null || v === undefined ? '' : String(v);
        const align = c.align ?? (typeof v === 'number' ? 'right' : 'left');
        return `<td style="text-align:${align}">${escapeHtml(text)}</td>`;
      })
      .join('');
    return `<tr>${cells}</tr>`;
  };
  const label = meta.groupLabel ?? 'Group';
  const groups = meta.groupBy ? groupRows(rows, meta.groupBy) : [{ key: '', rows }];
  const bodyHtml = groups
    .map(g => {
      const header = meta.groupBy
        ? `<tr><td colspan="${columns.length}" style="background:#eef2ff;font-weight:700;border-top:2px solid #444;padding:6px 7px">${escapeHtml(label)} : ${escapeHtml(g.key)}</td></tr>`
        : '';
      return header + g.rows.map(renderRow).join('');
    })
    .join('');
  const totalsHtml = meta.totals?.length
    ? `<tfoot><tr>${meta.totals
        .map((v, i) => {
          const text = v === null || v === undefined ? '' : String(v);
          const align = columns[i]?.align ?? (typeof v === 'number' ? 'right' : 'left');
          return `<td style="text-align:${align};font-weight:600;border-top:2px solid #000">${escapeHtml(text)}</td>`;
        })
        .join('')}</tr></tfoot>`
    : '';
  const subtitleHtml = meta.subtitle?.length
    ? `<div class="sub">${meta.subtitle.map(s => escapeHtml(s)).join(' &nbsp;|&nbsp; ')}</div>`
    : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(meta.title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:16px}
  h1{font-size:18px;margin:0 0 4px}
  .sub{font-size:11px;color:#555;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{padding:5px 7px;border-bottom:1px solid #ddd;vertical-align:top}
  thead th{background:#f3f4f6;border-bottom:2px solid #000;text-align:left;font-weight:600}
  tfoot td{background:#f9fafb}
  tr:nth-child(even) td{background:#fafafa}
  @media print { @page { size: A4 landscape; margin: 10mm } body{margin:0} }
</style></head><body>
<h1>${escapeHtml(meta.title)}</h1>
${subtitleHtml}
<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody>${totalsHtml}</table>
<script>window.addEventListener('load',()=>{setTimeout(()=>{window.focus();window.print();},150);});</script>
</body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/** Convenience formatter for INR amounts in CSV/print cells. */
export const inr = (n: number | string | null | undefined): string => {
  const v = Number(n ?? 0);
  if (!isFinite(v)) return '';
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Heuristic: returns true when a column header is numeric and should be right-aligned. */
export const isNumericHeader = (h: string): boolean =>
  /(Amt|Amount|Total|Rate|Qty|Weight|Wt\b|Paid|Remaining|Bata|RoundOff|\bBills\b|Round Off|Quantity|Tax\b|Price|Stock|Purchased|Sold|Consumed|Opening|Closing|Balance|Cash|Net|Gross|Payable|Receipt|Payment|\(T\)|\(Kg\)|\(\u20b9\)|\bNos\b|\bMRP\b|Discount)/i.test(h);

export const fmtDateISO = (iso: string | Date | null | undefined): string => {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN');
};

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Default date range used by report pages — current month, local time. */
export const currentMonthStart = (): string => {
  const n = new Date();
  return toYMD(new Date(n.getFullYear(), n.getMonth(), 1));
};
export const currentMonthEnd = (): string => {
  const n = new Date();
  return toYMD(new Date(n.getFullYear(), n.getMonth() + 1, 0));
};
