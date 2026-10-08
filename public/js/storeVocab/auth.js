// Same auth pattern as the journey branch's auth.js. Once the two
// branches merge, this duplicate should be deleted in favor of one
// shared auth.js both pages import - keeping two copies in sync by hand
// is a real risk, flagged here so it isn't forgotten.

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  // Supabase reports "nobody is logged in" as an error. That is a normal
  // answer for us, not a failure.
  if (error && error.name === "AuthSessionMissingError") return null;
  if (error) throw error;
  return data.user;
}