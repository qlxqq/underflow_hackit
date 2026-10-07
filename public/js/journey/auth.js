// Thin wrapper around Supabase Auth, plus creating the matching profiles row. //

async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

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