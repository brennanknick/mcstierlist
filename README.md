# soccer — tier list

A static PvP tier list. Four files, no build step, no backend, no database.

```
index.html    page shell
styles.css    all styling
app.js        renders the board (don't need to touch this)
data.js       ← the only file you edit to update the list
.nojekyll     stops GitHub Pages hiding files that start with "_"
```

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
   `https://brennanknick.github.io/mcstierlist/`.

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
