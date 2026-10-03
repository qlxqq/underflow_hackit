// TEMPORARY - duplicated from the store-vocabulary branch so Journey can
// run standalone before the two branches are merged. Once merged, delete
// this file and point journey.html at the real supabaseClient.js instead,
// so there's only one source of truth for the connection.
const SUPABASE_URL = "https://uicesiabnboovmwktsze.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY2VzaWFibmJvb3Ztd2t0c3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzA5ODYsImV4cCI6MjEwNjM0Njk4Nn0.9Ay5IMQb7i1NBFPUEgbZCD3c87_2KHCCvGcOTJfMBQY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);