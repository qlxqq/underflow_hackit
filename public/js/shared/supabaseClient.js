// Connection setup. These two values are meant to be public (unlike a
// database password) - safe to commit, safe to be visible in the browser.
const SUPABASE_URL = "https://uicesiabnboovmwktsze.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-04C5GJ6o5IOxgQstWEbvQ_Y7r8OnD4";

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

