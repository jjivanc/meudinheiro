import type { LedgerEntryType } from '../domain/types';

export interface ParsedTransaction {
  date: Date;
  description: string;
  amountCents: number;
  type: LedgerEntryType;
  importHash: string;
}

// ── Hash ──────────────────────────────────────────────────────────────────────

/**
 * Deterministic import hash based on date + description + amountCents.
 * Used to prevent duplicate imports.
 */
export function computeImportHash(
  date: string,
  description: string,
  amountCents: number,
): string {
  const raw = `${date}|${description}|${amountCents}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const lo = (h1 >>> 0).toString(16).padStart(8, '0');
  const hi = (h2 >>> 0).toString(16).padStart(8, '0');
  return hi + lo;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a Brazilian date string: DD/MM/YYYY or YYYY-MM-DD */
function parseDate(raw: string): Date | null {
  raw = raw.trim();
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    // Reject placeholder dates like "00/00/0000"
    if (brMatch[1] === '00' || brMatch[2] === '00') return null;
    const d = new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Parse a BRL-formatted or plain decimal value string to cents */
function parseAmountToCents(raw: string): number {
  // Remove currency symbols and spaces
  let cleaned = raw.replace(/[R$\s]/g, '').trim();
  // Track and strip leading minus sign so the BR-format regex can match
  const negative = cleaned.startsWith('-');
  if (negative) cleaned = cleaned.slice(1);
  // Handle Brazilian format: 1.234,56 → 1234.56
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Handle 1234,56 or 1234.56
    cleaned = cleaned.replace(',', '.');
  }
  const value = parseFloat(cleaned);
  const cents = isNaN(value) ? 0 : Math.round(value * 100);
  return negative ? -cents : cents;
}

function entryType(amountCents: number): LedgerEntryType {
  return amountCents >= 0 ? 'income' : 'expense';
}

// ── CSV parser ────────────────────────────────────────────────────────────────

/**
 * Parse a bank statement CSV file.
 *
 * Supports the most common Brazilian bank export formats including
 * Banco do Brasil (Data, Lançamento, Detalhes, N° documento, Valor, Tipo Lançamento).
 *
 * The first row is expected to be a header row.
 */
export function parseCsv(text: string): ParsedTransaction[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Detect delimiter: semicolon or comma
  const delimiter = lines[0].includes(';') ? ';' : ',';

  // Parse a CSV row respecting quoted fields that may contain the delimiter
  // e.g. "112,00" must not be split on the internal comma.
  // Handles doubled-quote escaping ("") per RFC 4180.
  const splitRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if ((ch === '"' || ch === "'") && !inQuotes) {
        inQuotes = true;
      } else if (ch === '"' && inQuotes) {
        // Doubled-quote ("") is an escaped literal quote inside a quoted field
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Normalize text for header matching: lowercase + remove diacritics
  // e.g. "Lançamento" → "lancamento", "Saída" → "saida"
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const headers = splitRow(lines[0]).map(norm);

  // Try to find column indices
  const dateIdx = headers.findIndex((h) => /^(data|date|dt)/.test(h));
  const descIdx = headers.findIndex((h) =>
    /^(descri|histor|memo|lanc|descr|desc)/.test(h),
  );
  // Optional "Detalhes" / detail column used by some banks (e.g. Banco do Brasil)
  const detailsIdx = headers.findIndex((h) =>
    /^(detalhe|detail|complemento|memo2)/.test(h),
  );
  // Signed value column (positive = credit, negative = debit)
  const valueIdx = headers.findIndex((h) =>
    /^(valor|value|amount|val\b)/.test(h),
  );
  // Separate debit/credit columns (some banks split them)
  const debitIdx = headers.findIndex((h) => /^(debito|debit|saida)/.test(h));
  const creditIdx = headers.findIndex((h) =>
    /^(credito|credit|entrada)/.test(h),
  );
  // "Tipo Lançamento" / type column used by banks like Banco do Brasil
  const typeIdx = headers.findIndex((h) => /^tipo/.test(h));

  if (dateIdx === -1 || descIdx === -1) return [];

  // Keywords that identify non-transaction balance/summary rows to skip
  const SKIP_KEYWORDS = /^(saldo|s\s+a\s+l\s+d\s+o)/i;

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    const date = parseDate(cols[dateIdx] ?? '');
    if (!date) continue;

    const lancamento = cols[descIdx] ?? '';
    // Skip balance/summary rows (e.g. "Saldo Anterior", "Saldo do dia", "S A L D O")
    if (SKIP_KEYWORDS.test(lancamento)) continue;

    // Combine description: primary column + details column when available
    const details = detailsIdx !== -1 ? (cols[detailsIdx] ?? '') : '';
    const description = details ? `${lancamento}: ${details}` : lancamento;

    let amountCents = 0;
    if (valueIdx !== -1 && cols[valueIdx]) {
      amountCents = parseAmountToCents(cols[valueIdx]);
    } else if (debitIdx !== -1 || creditIdx !== -1) {
      const debit =
        debitIdx !== -1 && cols[debitIdx]
          ? parseAmountToCents(cols[debitIdx])
          : 0;
      const credit =
        creditIdx !== -1 && cols[creditIdx]
          ? parseAmountToCents(cols[creditIdx])
          : 0;
      amountCents = credit - debit;
    }

    if (amountCents === 0 && !description) continue;

    // Determine entry type: prefer explicit type column ("Entrada"/"Saída") over sign
    let type: LedgerEntryType;
    if (typeIdx !== -1 && cols[typeIdx]) {
      const typeVal = norm(cols[typeIdx]);
      if (/^(entrada|credito|credit)/.test(typeVal)) {
        type = 'income';
      } else if (/^(saida|debito|debit)/.test(typeVal)) {
        type = 'expense';
      } else {
        type = entryType(amountCents);
      }
    } else {
      type = entryType(amountCents);
    }

    const dateStr = date.toISOString().slice(0, 10);
    transactions.push({
      date,
      description,
      amountCents: Math.abs(amountCents),
      type,
      importHash: computeImportHash(dateStr, description, Math.abs(amountCents)),
    });
  }

  return transactions;
}

// ── OFX parser ────────────────────────────────────────────────────────────────

/**
 * Parse an OFX/QFX bank statement file (SGML or XML variants).
 * Extracts <STMTTRN> blocks and returns normalized transactions.
 */
export function parseOfx(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Match every <STMTTRN>...</STMTTRN> block (XML) or flat SGML sections
  const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const tagRe = /<([A-Z]+)>([^<\n\r]*)/gi;

  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(text)) !== null) {
    const body = block[1];
    const fields: Record<string, string> = {};
    let tag: RegExpExecArray | null;
    tagRe.lastIndex = 0;
    while ((tag = tagRe.exec(body)) !== null) {
      fields[tag[1].toUpperCase()] = tag[2].trim();
    }

    const dtPosted = fields['DTPOSTED'] ?? '';
    // OFX date format: YYYYMMDD or YYYYMMDDHHMMSS[tz]
    const year = dtPosted.slice(0, 4);
    const month = dtPosted.slice(4, 6);
    const day = dtPosted.slice(6, 8);
    if (!year || !month || !day) continue;
    const date = new Date(`${year}-${month}-${day}T12:00:00`);

    const rawAmount = fields['TRNAMT'] ?? '0';
    const amountFloat = parseFloat(rawAmount.replace(',', '.'));
    const amountCents = isNaN(amountFloat)
      ? 0
      : Math.round(amountFloat * 100);

    const description =
      fields['MEMO'] ?? fields['NAME'] ?? fields['FITID'] ?? '';

    const dateStr = date.toISOString().slice(0, 10);
    transactions.push({
      date,
      description,
      amountCents: Math.abs(amountCents),
      type: entryType(amountCents),
      importHash: computeImportHash(dateStr, description, Math.abs(amountCents)),
    });
  }

  // SGML variant: no closing tags – match flat sections between <STMTTRN> tags
  if (transactions.length === 0) {
    const sgmlRe = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi;
    let sgmlBlock: RegExpExecArray | null;
    while ((sgmlBlock = sgmlRe.exec(text)) !== null) {
      const body = sgmlBlock[1];
      const fields: Record<string, string> = {};
      let tag: RegExpExecArray | null;
      tagRe.lastIndex = 0;
      while ((tag = tagRe.exec(body)) !== null) {
        fields[tag[1].toUpperCase()] = tag[2].trim();
      }

      const dtPosted = fields['DTPOSTED'] ?? '';
      const year = dtPosted.slice(0, 4);
      const month = dtPosted.slice(4, 6);
      const day = dtPosted.slice(6, 8);
      if (!year || !month || !day) continue;
      const date = new Date(`${year}-${month}-${day}T12:00:00`);

      const rawAmount = fields['TRNAMT'] ?? '0';
      const amountFloat = parseFloat(rawAmount.replace(',', '.'));
      const amountCents = isNaN(amountFloat)
        ? 0
        : Math.round(amountFloat * 100);

      const description =
        fields['MEMO'] ?? fields['NAME'] ?? fields['FITID'] ?? '';

      const dateStr = date.toISOString().slice(0, 10);
      transactions.push({
        date,
        description,
        amountCents: Math.abs(amountCents),
        type: entryType(amountCents),
        importHash: computeImportHash(dateStr, description, Math.abs(amountCents)),
      });
    }
  }

  return transactions;
}

// ── Entry point ───────────────────────────────────────────────────────────────

/** Read a File object and parse its contents based on the file extension. */
export async function parseBankStatementFile(
  file: File,
): Promise<ParsedTransaction[]> {
  const text = await file.text();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'ofx' || ext === 'qfx') return parseOfx(text);
  // Default to CSV
  return parseCsv(text);
}
