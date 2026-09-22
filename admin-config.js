/* ------------------------------------------------------------------
   ADMIN SETTINGS
   ------------------------------------------------------------------
   The password below is stored as a SHA-256 hash so the plain text
   isn't sitting in the source. Be clear about what it does though:
   this is a static site, so the check runs in the visitor's browser
   and a determined person can walk straight past it. It keeps the
   admin page tidy — it is NOT what protects your repo.

   What actually protects the repo is the GitHub token: it is fine-
   grained, scoped to this one repository, never published here, and
   revocable in one click.

   To change the password: open admin.html, unlock, and use the
   "change password" tool at the bottom. It prints a new line to paste
   over the one below.
   ------------------------------------------------------------------ */

window.ADMIN_CONFIG = {
  passwordHash:
    "2ca94a1856e69e7c1807168a6e37cb02e4a7048036091fa3c37bbca822581704",

  repo: "brennanknick/mcstierlist",
  branch: "main",
  path: "data.js",
};
