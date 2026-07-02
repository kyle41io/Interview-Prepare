/* Public Supabase config. URL + publishable (anon) key are PUBLIC by design
   (they ship in the browser bundle of every Supabase static app; Row-Level
   Security protects the data). Safe to commit. Empty = app runs local-only.
   SUPABASE_ANON_KEY holds the project's publishable key (sb_publishable_…). */
window.IP_CONFIG = {
  SUPABASE_URL: "https://tbihofgqjrwfgjtfjyrg.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_VRbWfTmVWD8WmQ51tRaPHw_GpqMpXvF",
  ADMIN_UIDS: [],  // public UI-gating; real enforcement is the Edge Function secret
};
