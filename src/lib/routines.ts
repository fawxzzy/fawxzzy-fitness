import "server-only";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export function getTodayDateInTimeZone(timeZone: string) {
  const parts = getDatePartsInTimeZone(new Date(), timeZone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${parts.year}-${month}-${day}`;
}

function parseDateStringAsUtc(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function getRoutineDayIndex(params: {
  cycleLengthDays: number;
  startDate: string;
  profileTimeZone: string;
}) {
  const { cycleLengthDays, startDate, profileTimeZone } = params;
  const todayDate = getTodayDateInTimeZone(profileTimeZone);

  const todayTs = parseDateStringAsUtc(todayDate);
  const startTs = parseDateStringAsUtc(startDate);
  const daysSinceStart = Math.floor((todayTs - startTs) / MS_PER_DAY);
  const normalized = ((daysSinceStart % cycleLengthDays) + cycleLengthDays) % cycleLengthDays;

  return normalized + 1;
}

export function createRoutineDaySeeds(cycleLengthDays: number, userId: string, routineId: string) {
  return Array.from({ length: cycleLengthDays }, (_, index) => ({
    user_id: userId,
    routine_id: routineId,
    day_index: index + 1,
    name: `Day ${index + 1}`,
    is_rest: false,
  }));
}
