// Thin wrapper around Supabase Auth, plus creating the matching profiles row.

async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // If email confirmation is OFF, signUp returns an active session
  // immediately, and we can create the profile row right away. If
  // confirmation is ON, data.session is null here - there's no auth.uid()
  // yet, so the profile gets created on their first successful sign-in
  // instead (see signIn below). Either way, the username is kept so
  // sign-in can use it.
  if (data.session) {
    await ensureProfileExists(data.user.id, username);
  } else {
    pendingUsernamesByEmail[email] = username;
  }
  return data;
}

const pendingUsernamesByEmail = {};

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Covers the case where signUp couldn't create the profile yet because
  // email confirmation was required at the time.
  const username = pendingUsernamesByEmail[email] || data.user.email.split("@")[0];
  await ensureProfileExists(data.user.id, username);

  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

async function ensureProfileExists(userId, usernameIfCreating) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase
    .from("profiles")
    .insert({ user_id: userId, username: usernameIfCreating });

  if (error) throw error;
}