// Connection setup. These two values are meant to be public (unlike a
// database password) - safe to commit, safe to be visible in the browser.
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key-here";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);