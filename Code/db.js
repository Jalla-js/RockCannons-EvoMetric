console.log("DB LOADED");

// Prevent duplicate client creation safely
window.sb =
  window.sb ||
  window.supabase.createClient(
    "https://tqckatmslprqudepubjs.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY2thdG1zbHBycXVkZXB1YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDEyNzQsImV4cCI6MjA4OTQxNzI3NH0._x4f9D57Vh5tRL6PuKC6K-QETa1pbXU56fkkKIK6kx8"
  );

console.log("SB READY");


//hides add button if not logged in
const updateAddButtonVisibility = (user) => {
  const addBtn = document.querySelector('.btn-add');
  if (addBtn) {
    addBtn.style.display = user ? "inline-flex" : "none";
  }
};

//i need add admin button only for admin

//database functions

window.getVisibleSites = async function () {
  return await window.sb
    .from("sites")
    .select("*")
    .neq("status", "rejected");
};

window.addSite = async function (site) {
  return await window.sb.from("sites").insert([site]);
};

window.getCurrentUser = async function () {
  const { data } = await window.sb.auth.getUser();
  return data.user;
};

window.getUserRole = async function () {
  const user = await window.getCurrentUser();
  if (!user) return null;

  const { data } = await window.sb
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return data?.role;
};

window.getCurrentUser().then(user => {
  updateAddButtonVisibility(user);
});

window.sb.auth.onAuthStateChange((event, session) => {
  updateAddButtonVisibility(session?.user || null);
});

console.log("DB READY");