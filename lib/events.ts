import { MARKET_TIME_ZONE } from "./market";
import type { EconomicEvent, EconomicEventKind } from "./types";

const ECONOMIC_EVENT_LABELS: Record<EconomicEventKind, string> = {
  fed: "美联储",
  nonfarm: "非农",
  cpi: "CPI",
  delivery: "期指交割",
};

const CALENDAR_ENDPOINT = "https://datacenter-web.eastmoney.com/api/data/v1/get";
const CALENDAR_COLUMNS = "START_DATE,FE_NAME,CITY";
const HOLIDAY_ENDPOINT = "https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master";
const CALENDAR_PAGE_SIZE = 500;
const CALENDAR_MAX_PAGES = 3;
const CALENDAR_HORIZON_DAYS = 150;
const UPCOMING_WINDOW_DAYS = 14;
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

// Eastmoney's calendar already returns Beijing time; match the headline series
// for each release so the same timestamp is not listed several times.
const KIND_PATTERNS: ReadonlyArray<readonly [EconomicEventKind, RegExp]> = [
  ["fed", /^美国[：:]联邦基金利率目标[：:]/],
  ["nonfarm", /^美国[：:]非农就业人数[：:]季调[(（]/],
  ["cpi", /^美国[：:]CPI[：:]季调[：:]环比[(（]/],
];

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: MARKET_TIME_ZONE,
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: MARKET_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

interface CalendarRow {
  START_DATE?: string | null;
  FE_NAME?: string | null;
  CITY?: string | null;
}

interface CalendarPayload {
  result?: {
    data?: CalendarRow[] | null;
    pages?: number | null;
  } | null;
}

interface HolidayPayload {
  days?: Array<{
    date?: string | null;
    isOffDay?: boolean | null;
  }> | null;
}

function partsOf(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return parts;
}

export function beijingDay(timestamp: number): string {
  const parts = partsOf(dayFormatter, new Date(timestamp));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(date: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const stamp =
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) +
    days * 86400000;
  return new Date(stamp).toISOString().slice(0, 10);
}

function parseStart(value: string | null | undefined): Pick<
  EconomicEvent,
  "startsAt" | "date" | "time"
> | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?$/.exec(
    value.trim(),
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const utc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(utc);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  return {
    startsAt: utc - BEIJING_OFFSET_MS,
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`日历接口返回 ${response.status}`);
    return (await response.json()) as T;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function fetchEconomicEventsWindow(
  from: string,
  to: string,
): Promise<EconomicEvent[]> {
  const events: EconomicEvent[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= CALENDAR_MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      reportName: "RPT_CPH_FECALENDAR",
      columns: CALENDAR_COLUMNS,
      pageSize: String(CALENDAR_PAGE_SIZE),
      pageNumber: String(page),
      sortColumns: "START_DATE",
      sortTypes: "1",
      filter: `(STD_TYPE_CODE="2")(CITY="美国")(START_DATE>='${from}')(START_DATE<'${to}')`,
      source: "WEB",
      client: "WEB",
    });
    const payload = await fetchJson<CalendarPayload>(
      `${CALENDAR_ENDPOINT}?${params.toString()}`,
    );
    const rows = payload.result?.data ?? [];

    for (const row of rows) {
      if (row.CITY !== "美国") continue;
      const name = typeof row.FE_NAME === "string" ? row.FE_NAME : "";
      const match = KIND_PATTERNS.find(([, pattern]) => pattern.test(name));
      if (!match) continue;

      const start = parseStart(row.START_DATE);
      if (!start) continue;
      const key = `${match[0]}:${start.startsAt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ kind: match[0], name: ECONOMIC_EVENT_LABELS[match[0]], ...start });
    }

    const pages = payload.result?.pages ?? 1;
    if (page >= pages || rows.length === 0) break;
  }

  return events;
}

async function fetchHolidaySet(year: number): Promise<Set<string>> {
  try {
    const payload = await fetchJson<HolidayPayload>(`${HOLIDAY_ENDPOINT}/${year}.json`);
    const days = new Set<string>();
    for (const day of payload.days ?? []) {
      if (!day || day.isOffDay !== true || typeof day.date !== "string") continue;
      if (/^\d{4}-\d{2}-\d{2}$/.test(day.date)) days.add(day.date);
    }
    return days;
  } catch {
    return new Set<string>();
  }
}

async function fetchHolidaySets(years: number[]): Promise<Map<number, Set<string>>> {
  const entries = await Promise.all(
    years.map(async (year) => [year, await fetchHolidaySet(year)] as const),
  );
  return new Map(entries);
}

// Stock index futures expire on the third Friday. CFFEX moves the last trading
// day to the next session when that Friday is an exchange holiday.
function thirdFriday(year: number, month: number): string {
  const first = Date.UTC(year, month - 1, 1);
  const firstWeekday = new Date(first).getUTCDay();
  const offset = (5 - firstWeekday + 7) % 7;
  return new Date(first + (offset + 14) * 86400000).toISOString().slice(0, 10);
}

function isMarketClosed(date: string, holidays: Set<string>): boolean {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6 || holidays.has(date);
}

function rollForward(date: string, holidays: Set<string>): string {
  let stamp = Date.parse(`${date}T00:00:00Z`);
  for (let index = 0; index < 14; index += 1) {
    const current = new Date(stamp).toISOString().slice(0, 10);
    if (!isMarketClosed(current, holidays)) return current;
    stamp += 86400000;
  }
  return date;
}

function deliveryEvents(
  from: string,
  to: string,
  holidaysByYear: Map<number, Set<string>>,
): EconomicEvent[] {
  const events: EconomicEvent[] = [];
  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));

  for (let year = startYear; year <= endYear; year += 1) {
    const holidays = holidaysByYear.get(year) ?? new Set<string>();
    for (let month = 1; month <= 12; month += 1) {
      const date = rollForward(thirdFriday(year, month), holidays);
      if (date < from || date > to) continue;
      const start = parseStart(`${date} 15:00:00`);
      if (start) {
        events.push({
          kind: "delivery",
          name: ECONOMIC_EVENT_LABELS.delivery,
          ...start,
        });
      }
    }
  }

  return events;
}

export async function fetchEconomicEvents(): Promise<EconomicEvent[]> {
  const from = beijingDay(Date.now());
  const to = addDays(from, CALENDAR_HORIZON_DAYS);
  const years = Array.from(
    new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))]),
  );
  const [economic, holidays] = await Promise.all([
    fetchEconomicEventsWindow(from, to),
    fetchHolidaySets(years),
  ]);

  const events = [...economic, ...deliveryEvents(from, to, holidays)];
  events.sort((a, b) => a.startsAt - b.startsAt);
  return events;
}

export function upcomingEconomicEvents(
  events: EconomicEvent[],
  now: number,
  windowDays = UPCOMING_WINDOW_DAYS,
): EconomicEvent[] {
  const cutoff = now + windowDays * 86400000;
  return events
    .filter((event) => event.startsAt > now && event.startsAt <= cutoff)
    .sort((a, b) => a.startsAt - b.startsAt);
}

export function formatEconomicEventDate(startsAt: number): string {
  const parts = partsOf(dateFormatter, new Date(startsAt));
  return `${parts.month}月${parts.day}日 ${parts.weekday}`;
}

export function formatEconomicEventTime(startsAt: number): string {
  return timeFormatter.format(new Date(startsAt));
}
