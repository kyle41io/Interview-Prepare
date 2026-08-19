// SYS + prefilter regex ported verbatim from supabase/functions/gmail-scan/index.ts.
export const CLASSIFY_SYS =
  "You classify a recruiting-related email for an IT job seeker. Return JSON per the schema. is_recruiting=false if it is not about a job application/interview/offer/rejection/test. kind: test=coding test/assessment, interview=interview invite/schedule, offer=job offer, rejection=declined, other=recruiting but none of these. event_at/deadline_at: ISO 8601 if a date/time is present, else null. Keep summary <=200 chars, in the email's language.";

export const RECRUIT_RE =
  /(interview|phỏng|assessment|coding|test|take-home|offer|onboarding|tuyển|recruit|application|regret|unfortunately|shortlist|screening|hiring|vòng)/i;

export const CLASSIFY_INSTRUCTION =
  ' The input carries the email\'s own Date header: resolve every relative or partial date ("next Tuesday", "thứ 5 tuần này", "14:00 21/08") against it and answer with an absolute timestamp, never a phrase. Prefer the local time written in the email over a converted one. Respond with ONLY a JSON object with keys: is_recruiting (boolean), kind ("test"|"interview"|"offer"|"rejection"|"other"), company (string), title (string), event_at (ISO 8601 string or null), deadline_at (ISO 8601 string or null), summary (string). No prose, no code fences.';

export interface Classification {
  is_recruiting: boolean;
  kind: string;
  company: string;
  title: string;
  event_at: string | null;
  deadline_at: string | null;
  summary: string;
}

/** The model is told to answer ISO 8601 or null, and mostly does — rows written
 *  by earlier runs hold `deadline_at: true`, which is what an unchecked boolean
 *  answer becomes once it reaches DynamoDB. A junk date is worse than no date:
 *  the calendar keys each day off the ISO prefix, so the reminder exists in the
 *  table and shows up nowhere on screen, where the user can neither see it nor
 *  delete it. Anything that is not a real timestamp becomes null.
 *
 *  The string is returned as written, not re-serialized: reminder times are
 *  floating wall-clock (see IP.calendar.buildWhen), so "14:00" from the email
 *  must stay 14:00 rather than shifting through a UTC round trip. */
export function normalizeDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  // YYYY-MM-DD, optionally followed by a time and an offset.
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(s)) return null;
  // Rejects the impossible (month 13, hour 99) that the regex alone accepts.
  const probe = s.length <= 10 ? s + "T00:00:00Z" : s.replace(" ", "T");
  if (Number.isNaN(new Date(probe).getTime())) return null;
  // A parseable string can still be a rolled-over date (2026-02-30 -> Mar 2).
  if (new Date(probe).toISOString().slice(0, 10) !== s.slice(0, 10) && s.length <= 10) return null;
  // Drop the zone rather than convert through it. The digits a recruiter wrote
  // are already local to the offset the model attached, and the calendar renders
  // reminder times in UTC on purpose — so "09:00+07:00" kept whole displays as
  // 02:00, which is how the first body-read invitation landed two hours early.
  return s.replace(/(Z|[+-]\d{2}:?\d{2})$/, "");
}
