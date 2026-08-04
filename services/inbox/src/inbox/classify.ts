// SYS + prefilter regex ported verbatim from supabase/functions/gmail-scan/index.ts.
export const CLASSIFY_SYS =
  "You classify a recruiting-related email for an IT job seeker. Return JSON per the schema. is_recruiting=false if it is not about a job application/interview/offer/rejection/test. kind: test=coding test/assessment, interview=interview invite/schedule, offer=job offer, rejection=declined, other=recruiting but none of these. event_at/deadline_at: ISO 8601 if a date/time is present, else null. Keep summary <=200 chars, in the email's language.";

export const RECRUIT_RE =
  /(interview|phỏng|assessment|coding|test|take-home|offer|onboarding|tuyển|recruit|application|regret|unfortunately|shortlist|screening|hiring|vòng)/i;

export const CLASSIFY_INSTRUCTION =
  ' Respond with ONLY a JSON object with keys: is_recruiting (boolean), kind ("test"|"interview"|"offer"|"rejection"|"other"), company (string), title (string), event_at (ISO 8601 string or null), deadline_at (ISO 8601 string or null), summary (string). No prose, no code fences.';

export interface Classification {
  is_recruiting: boolean;
  kind: string;
  company: string;
  title: string;
  event_at: string | null;
  deadline_at: string | null;
  summary: string;
}
