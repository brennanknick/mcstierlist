# MCS — tier list

A static PvP tier list. No build step, no backend, no database.

```
index.html       the public tier list
styles.css       all styling
app.js           renders the board
data.js          ← the player data

admin.html       the staff editor  ┐
admin.css        its styling       │ see "Admin" below
admin.js         its logic         │
admin-config.js  password + repo   ┘

assets/          logo, favicons, social card (generated from the MCS logo)
.nojekyll        stops GitHub Pages hiding files that start with "_"
```

`assets/` holds `mcs-logo.png` (transparent, used in the sidebar),
`favicon.ico` + `icon-180/512.png` (dark plate, so they read on a light browser
tab) and `og.png`, the 1200x630 card Discord shows when the link is pasted.
To regenerate them from a new logo, see the note at the bottom of this file.

---

## Editing the list

Open `data.js`. Each tier is one block:

```js
{
  tier: 4,
  color: "#c084fc",
  high: ["S8ns", "DrDillon", "2XXS"],
  low:  ["ScarIsBad", "CluLessBird"],
},
```

- Use the player's **exact Minecraft username** — head avatars are looked up from it.
- Order inside an array = order on the page. To promote someone, move their name up.
- An empty array (`high: []`) renders a `—` placeholder, like Tier 2 does now.
- To add a Tier 8, copy a whole block and change `tier` and `color`.
- Set `discord: "https://discord.gg/…"` at the bottom to make the sidebar icon live.

If you break the syntax (missing comma, unclosed quote) the page shows a red
"could not load" banner instead of going blank — reload after fixing.

## Viewing it locally

Double-clicking `index.html` works. Or serve it:

```bash
python -m http.server 8765 --directory tierlist
```

## Keyboard / UI

| Action | How |
|---|---|
| Search players | `/` or `Ctrl`+`K`, or the sidebar magnifier |
| Filter tiers / hide low tier | the sidebar filter icon |
| Player card | click any row |
| Close anything | `Esc` |

Avatars come from `mc-heads.net` with a `minotar.net` fallback and a generic
head if both fail. Both are free and need no API key.

---

## Admin

**https://tiers.mcsoccer.net/admin.html**

Click any player to open the editor: rename them, pick a tier, switch between
high and low, nudge their position, or remove them. The `+` in the sidebar adds
a player. On a desktop you can also drag rows between tiers. Then **save to
github** and the live list updates in about a minute.

`Ctrl`+`Z` undoes, `Ctrl`+`S` saves, `Esc` closes a dialog. The page warns you
if you try to leave with unsaved changes.

### Read this before handing it to anyone

**The password is a sign on a door, not a lock.** This is a static site — there
is no server running our code, so the check happens in the visitor's browser and
someone who knows how can walk straight past it. It stops casual wandering. It
is not security.

**The GitHub token is the actual boundary.** That is why the token is *not* in
the published files — each admin pastes their own copy into their own browser,
where it is kept in that browser's localStorage and sent only to
`api.github.com`. Scope it as narrowly as GitHub allows and the worst case if it
leaks is that someone edits the tier list, which is what an admin can do anyway.
Revoking it takes one click.

If you ever want a real lock — staff type only a password, no tokens, nothing
sensitive in the browser — that needs something server-side. A Cloudflare Worker
holding the token as a secret is the small version of that, and it stays free.

### Making the token

1. [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens)
   → **Generate new token** → *Fine-grained*.
2. **Repository access** → *Only select repositories* → pick **mcstierlist**.
   Nothing else.
3. **Permissions** → *Repository permissions* → **Contents: Read and write**.
   Leave every other permission alone.
4. Set an expiry you are happy to renew. Generate, copy the `github_pat_…`
   string — GitHub shows it once.
5. In the admin page, hit **save to github**; it asks for the token. Paste,
   save. That browser remembers it.

### Changing the password

Open the admin page, expand **change password** at the bottom, type the new one,
and paste the line it prints over `passwordHash` in `admin-config.js`. Commit
that file.

The default is `mcs-admin` — change it.

### If two admins edit at once

Saving compares what the repo holds *now* against what it held when your page
loaded. If someone else saved in between, the write is refused before it is
sent and you are told to copy your edits and reload.

This matters because the obvious version of the check does not work: fetching
the file's sha a few milliseconds before writing always returns the current one,
so GitHub always accepts the write and the second admin silently reverts the
first. The window that needs guarding is page-load-to-save, which can be hours.

---

## Free hosting

Researched against the providers' own live pricing pages, Sept 2026.

| Provider | Free bandwidth | Custom domain | How you deploy | Biggest catch |
|---|---|---|---|---|
| **GitHub Pages** | 100 GB/mo (soft) | Yes, free HTTPS | git push, GitHub Desktop, or browser upload | repo must be **public** on the free plan |
| **Cloudflare Pages** | **Unlimited** (static assets) | Yes, free HTTPS | dashboard drag-and-drop, git, or Wrangler | Direct Upload → git is a one-way door |
| Vercel Hobby | 100 GB/mo | Yes, free HTTPS | git push, CLI, or Drop | Hobby is **non-commercial only** — see below |
| Netlify | ~15 GB/mo effective | Yes, free HTTPS | drag-and-drop, git, CLI | **15 credits per deploy**, ~19/mo, then the site goes **offline** |
| Render (static) | **5 GB/mo** | Yes | git only | over the cap with no card = spun down till next month |
| Neocities | 200 GB/mo | **No** — $5/mo | browser editor | fails the custom-domain requirement |
| Codeberg Pages | no quota | Yes, free | web commit or git | terms **ban mostly-AI-generated repos** |

**Recommendation: GitHub Pages.** It is the only one with a $0-forever tier,
free custom-domain HTTPS, *and* a browser edit-and-commit flow — which matters
here, because updating the list is editing one file. No card, no trial clock,
no sleep, no credit meter that can dark the site mid-month.

**Runner-up: Cloudflare Pages**, if you expect Discord-spike traffic — static
asset bandwidth is officially unlimited. Best of both: push to GitHub as below,
then connect that repo to Cloudflare Pages using **git integration** (never
Direct Upload).

Avoid **Netlify** (deploy credits run out and the site goes offline),
**Vercel Hobby** if the site will ever link to a server store selling
ranks or keys (that is "commercial use" and enforcement is a 503), and
**Codeberg** outright.

### Deploying to GitHub Pages

1. Make a free GitHub account. No card is requested.
2. github.com → **+** → **New repository** → name it `mcstierlist` → **Public**
   (Pages does not serve from a private repo on the free plan) → don't add a
   README → **Create repository**.
3. Push this folder. Easiest without a terminal: install **GitHub Desktop** →
   **File → Add local repository** → point at `C:\path\to\tierlist` →
   accept *"create a repository here"* → **Publish repository**, unchecking
   *"Keep this code private"*.

   Or from PowerShell in this folder:
   ```bash
   git init -b main
   git add -A
   git commit -m "Initial tier list"
   git remote add origin https://github.com/brennanknick/mcstierlist.git
   git push -u origin main
   ```
4. Repo → **Settings → Pages** → Source **Deploy from a branch** → branch
   `main`, folder `/ (root)` → **Save**. Live in ~1 minute at
   `https://tiers.mcsoccer.net/`.

All asset paths here are already relative and all avatar URLs are already
`https://`, so nothing breaks on the subpath or under enforced HTTPS.

**No-git fallback:** in the empty repo click **Add file → Upload files** and
drag the *contents* of this folder (so `index.html` lands at the repo root, not
inside a subfolder), then **Commit changes**. `.nojekyll` won't survive an
Explorer drag on Windows — recreate it with **Add file → Create new file**,
name it `.nojekyll`, leave it empty, commit.

### Custom domain (optional)

1. Verify the domain first (prevents takeovers): profile photo → **Settings →
   Pages → Add a domain** → add the TXT record it shows at your registrar.
2. At the registrar's DNS:
   - apex (`example.com`): four **A** records → `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: one **CNAME** → `brennanknick.github.io`
3. Repo → **Settings → Pages → Custom domain** → enter it → **Save**. Once the
   DNS check passes, tick **Enforce HTTPS** (the cert can take up to an hour).

If your DNS has any **CAA** records, at least one must allow `letsencrypt.org`.
Never point wildcard DNS (`*.example.com`) at Pages.

### Updating once live

Open `data.js` on github.com, click the pencil, edit, **Commit changes**. Live
in about a minute, from any browser including a phone.


---

## Regenerating the icons

All of `assets/` is derived from one square logo image. The source was white
art on a black background, so luminance doubles as the alpha channel — that is
what keeps the anti-aliased edges clean instead of crunchy. If the logo ever
changes, the recipe is: autocrop to the art's bounding box, use grayscale as
alpha for the transparent version, and composite onto `#0b0b0d` for the
favicons (a transparent logo disappears on a light browser tab).

Note `og:image` in `index.html` is an absolute URL — Discord and Twitter will
not resolve a relative one. If the site ever moves, that URL has to move too.
