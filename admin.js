/* ==================================================================
   MCS — tier list admin

   Edits a working copy of TIER_DATA, serialises it back into the same
   hand-editable data.js shape, and commits that to GitHub.

   On the password: this is a static site, so the check below runs in
   the visitor's browser and cannot be a real access control. It keeps
   the page tidy. The GitHub token is the actual boundary — it lives in
   this browser's localStorage, is never published, is scoped to one
   repo, and is revocable.
   ================================================================== */

(function () {
  "use strict";

  const CFG = window.ADMIN_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const TOKEN_KEY = "mcs_admin_token";

  /* deep copy so a botched edit never corrupts the loaded data */
  let data = JSON.parse(JSON.stringify(window.TIER_DATA || TIER_DATA));
  const history = [];
  let dirty = false;
  let saving = false;

  /* What the repo held when this page loaded, and after each save. Dirtiness
     and conflict detection are both measured against this — not against the
     undo stack's depth, which stops being a proxy for "clean" the moment the
     60-entry cap trims an entry. */
  let savedTiers = JSON.stringify(data.tiers);

  /* ── toast ──────────────────────────────────────────────────── */

  let toastTimer = null;
  function toast(msg, kind) {
    const el = $("toast");
    el.textContent = msg;
    el.className = "toast" + (kind ? " is-" + kind : "");
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), kind === "err" ? 9000 : 4000);
  }

  /* ── lock screen ────────────────────────────────────────────── */

  async function sha256(text) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  $("lock-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const hash = await sha256($("lock-input").value);
    if (hash === CFG.passwordHash) {
      $("lock").hidden = true;
      $("app").hidden = false;
      render();
    } else {
      $("lock-note").textContent = "wrong password";
      $("lock-input").select();
    }
  });

  /* ── snapshot / undo ────────────────────────────────────────── */

  function snapshot() {
    history.push(JSON.stringify(data));
    if (history.length > 60) history.shift();
    setDirty(true);
  }

  function setDirty(v) {
    dirty = v;
    $("dirty").textContent = v ? "unsaved changes" : "no changes";
    $("dirty").classList.toggle("is-dirty", v);
    $("btn-save").disabled = !v || saving;
  }

  function recheckDirty() {
    setDirty(JSON.stringify(data.tiers) !== savedTiers);
  }

  $("btn-undo").addEventListener("click", () => {
    if (!history.length) return toast("nothing to undo");
    // the editor holds raw indices into the old data; they are meaningless
    // against the restored copy, so close it rather than let it write blind
    closeEditor();
    drag = null;
    data = JSON.parse(history.pop());
    render();
    recheckDirty();
  });

  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  /* ── avatar ─────────────────────────────────────────────────── */

  function head(img, name) {
    const srcs = [
      `https://mc-heads.net/avatar/${encodeURIComponent(name)}/48`,
      `https://minotar.net/helm/${encodeURIComponent(name)}/48`,
    ];
    let i = 0;
    img.src = srcs[0];
    img.onerror = () => {
      i += 1;
      if (i < srcs.length) img.src = srcs[i];
      else img.onerror = null;
    };
  }

  /* ── render ─────────────────────────────────────────────────── */

  let drag = null; // { tier, band, index }

  function render() {
    const wrap = $("columns");
    wrap.innerHTML = "";

    let count = 0;

    data.tiers.forEach((t) => {
      const col = document.createElement("section");
      col.className = "col";
      col.style.setProperty("--c", t.color);
      col.dataset.tier = String(t.tier);

      const head_ = document.createElement("header");
      head_.className = "col-head";
      head_.innerHTML = `<span class="col-title">tier ${t.tier}</span>`;
      col.appendChild(head_);

      const body = document.createElement("div");
      body.className = "col-body";

      ["high", "low"].forEach((bandKey) => {
        const list = (t[bandKey] = t[bandKey] || []);
        count += list.length;

        const band = document.createElement("div");
        band.className = "band " + bandKey;
        band.dataset.band = bandKey;
        band.dataset.tier = String(t.tier);

        if (!list.length) {
          const empty = document.createElement("div");
          empty.className = "band-empty";
          empty.textContent = "—";
          band.appendChild(empty);
        }

        list.forEach((name, i) => {
          band.appendChild(makeRow(name, t.tier, bandKey, i));
        });

        wireBand(band);
        body.appendChild(band);
      });

      col.appendChild(body);
      wrap.appendChild(col);
    });

    $("rail-count").textContent = String(count);
  }

  function makeRow(name, tier, band, index) {
    const row = document.createElement("div");
    row.className = "row";
    row.draggable = true;
    row.dataset.tier = String(tier);
    row.dataset.band = band;
    row.dataset.index = String(index);

    const img = document.createElement("img");
    img.className = "row-head";
    img.alt = "";
    head(img, name);

    const nm = document.createElement("span");
    nm.className = "row-name";
    nm.textContent = name;

    row.append(img, nm);

    row.addEventListener("dragstart", (e) => {
      drag = { tier, band, index };
      row.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      // Firefox needs data set or the drag never starts
      e.dataTransfer.setData("text/plain", name);
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("is-dragging");
      clearMarkers();
      drag = null;
    });

    row.addEventListener("click", (e) => {
      if (drag) return;
      e.stopPropagation();
      openEditor(tier, band, index);
    });

    return row;
  }

  /* ── drag targets ───────────────────────────────────────────── */

  function clearMarkers() {
    document
      .querySelectorAll(".band.is-target")
      .forEach((b) => b.classList.remove("is-target"));
    document.querySelectorAll(".drop-line").forEach((l) => l.remove());
  }

  function wireBand(band) {
    band.addEventListener("dragover", (e) => {
      if (!drag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      clearMarkers();
      band.classList.add("is-target");

      const at = insertionIndex(band, e.clientY);
      const line = document.createElement("div");
      line.className = "drop-line";
      const rows = [...band.querySelectorAll(".row:not(.is-dragging)")];
      if (at >= rows.length) band.appendChild(line);
      else band.insertBefore(line, rows[at]);
    });

    band.addEventListener("dragleave", (e) => {
      if (!band.contains(e.relatedTarget)) {
        band.classList.remove("is-target");
      }
    });

    band.addEventListener("drop", (e) => {
      if (!drag) return;
      e.preventDefault();
      const at = insertionIndex(band, e.clientY);
      clearMarkers();
      move(drag, {
        tier: Number(band.dataset.tier),
        band: band.dataset.band,
        index: at,
      });
    });
  }

  /* how many rows sit above the cursor */
  function insertionIndex(band, y) {
    const rows = [...band.querySelectorAll(".row:not(.is-dragging)")];
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return rows.length;
  }

  function listOf(tier, band) {
    const t = data.tiers.find((x) => x.tier === tier);
    return t ? t[band] : null;
  }

  function move(from, to) {
    const src = listOf(from.tier, from.band);
    const dst = listOf(to.tier, to.band);
    if (!src || !dst) return;

    if (from.index < 0 || from.index >= src.length) return;

    snapshot();
    const [name] = src.splice(from.index, 1);

    /* No shift correction here: insertionIndex() measures the band with the
       dragged row filtered out, so to.index is already an index into the
       post-removal list. Correcting again lands every same-band downward
       drag one slot too high. */
    const at = Math.max(0, Math.min(to.index, dst.length));

    dst.splice(at, 0, name);
    render();
  }

  /* ── add / edit / remove ────────────────────────────────────── */

  let editing = null;

  /* tier chips, built once */
  data.tiers.forEach((t) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.dataset.tier = String(t.tier);
    chip.style.setProperty("--c", t.color);
    chip.textContent = "t" + t.tier;
    $("edit-tiers").appendChild(chip);
  });

  /* Dragging is a desktop nicety — touch devices never fire HTML5 drag
     events. These controls are the path that works everywhere. */

  function paintEditor() {
    document.querySelectorAll("#edit-tiers .chip").forEach((c) => {
      c.classList.toggle("is-on", Number(c.dataset.tier) === editing.tier);
    });
    document.querySelectorAll(".chip[data-band]").forEach((c) => {
      c.classList.toggle("is-on", c.dataset.band === editing.band);
    });

    const list = listOf(editing.tier, editing.band) || [];
    $("edit-pos").textContent = `${editing.index + 1} of ${list.length}`;
    $("edit-up").disabled = editing.index <= 0;
    $("edit-down").disabled = editing.index >= list.length - 1;
    $("edit-title").textContent =
      `${editing.band === "high" ? "HT" : "LT"}${editing.tier}`;
  }

  function openEditor(tier, band, index) {
    editing = { tier, band, index };
    $("edit-name").value = listOf(tier, band)[index];
    paintEditor();
    $("edit-overlay").hidden = false;
    $("edit-name").focus();
    $("edit-name").select();
  }

  /* moving via the chips reuses the same move() the drag path uses */
  function relocate(tier, band) {
    if (tier === editing.tier && band === editing.band) return;
    const dst = listOf(tier, band);
    if (!dst) return;
    move(editing, { tier, band, index: dst.length });
    editing = { tier, band, index: listOf(tier, band).length - 1 };
    paintEditor();
  }

  $("edit-tiers").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip && editing) relocate(Number(chip.dataset.tier), editing.band);
  });

  document.querySelectorAll(".chip[data-band]").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (editing) relocate(editing.tier, chip.dataset.band);
    });
  });

  function nudge(delta) {
    const list = listOf(editing.tier, editing.band);
    if (!list || editing.index < 0 || editing.index >= list.length) return;
    const to = editing.index + delta;
    if (to < 0 || to >= list.length) return;
    snapshot();
    const [n] = list.splice(editing.index, 1);
    list.splice(to, 0, n);
    editing.index = to;
    render();
    paintEditor();
  }

  $("edit-up").addEventListener("click", () => nudge(-1));
  $("edit-down").addEventListener("click", () => nudge(1));

  function closeEditor() {
    $("edit-overlay").hidden = true;
    editing = null;
  }

  $("edit-close").addEventListener("click", closeEditor);
  $("edit-overlay").addEventListener("click", (e) => {
    if (e.target === $("edit-overlay")) closeEditor();
  });

  /* Minecraft usernames are [A-Za-z0-9_]. Enforcing that here is mostly to
     catch typos, but it also guarantees a name can never carry a quote or a
     newline into data.js and break the file for everyone. */
  const NAME_OK = /^[A-Za-z0-9_]{1,16}$/;

  function validName(v) {
    const n = v.trim();
    if (!n) return toast("name can't be empty", "err"), null;
    if (!NAME_OK.test(n)) {
      toast(
        "a minecraft username is 1-16 letters, numbers or underscores",
        "err"
      );
      return null;
    }
    return n;
  }

  /* `skip` is the slot being edited, so re-applying an unchanged name is fine */
  function findDupe(name, skip) {
    const lower = name.toLowerCase();
    for (const t of data.tiers) {
      for (const band of ["high", "low"]) {
        const list = t[band] || [];
        for (let i = 0; i < list.length; i += 1) {
          if (skip && skip.tier === t.tier && skip.band === band && skip.index === i)
            continue;
          if (list[i].toLowerCase() === lower) return t;
        }
      }
    }
    return null;
  }

  $("edit-apply").addEventListener("click", () => {
    if (!editing) return;
    const v = validName($("edit-name").value);
    if (!v) return;

    const list = listOf(editing.tier, editing.band);
    if (!list || editing.index >= list.length) {
      closeEditor();
      return toast("that player moved — reopen them and try again", "err");
    }

    const dupe = findDupe(v, editing);
    if (dupe) return toast(`${v} is already in tier ${dupe.tier}`, "err");

    snapshot();
    list[editing.index] = v;
    closeEditor();
    render();
  });

  $("edit-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("edit-apply").click();
  });

  $("edit-remove").addEventListener("click", () => {
    if (!editing) return;
    const list = listOf(editing.tier, editing.band);
    if (!list || editing.index >= list.length) {
      closeEditor();
      return toast("that player moved — reopen them and try again", "err");
    }
    snapshot();
    list.splice(editing.index, 1);
    closeEditor();
    render();
  });

  $("btn-add").addEventListener("click", () => {
    const raw = prompt("Minecraft username to add (lands in low tier 7):");
    if (raw === null) return;
    const name = validName(raw);
    if (!name) return;

    const dupe = findDupe(name, null);
    if (dupe) return toast(`${name} is already in tier ${dupe.tier}`, "err");

    const last = data.tiers[data.tiers.length - 1];
    snapshot();
    (last.low = last.low || []).push(name);
    render();
    toast(`added ${name} — now move them to the right tier`);
  });

  /* ── serialise back to data.js ──────────────────────────────── */

  const HEADER = `/* ------------------------------------------------------------------
   TIER LIST DATA
   ------------------------------------------------------------------
   This is the only file you need to edit to update the tier list.

   Each tier has a \`high\` array and a \`low\` array. Put the player's
   exact Minecraft username in quotes, separated by commas.
   Head avatars are fetched automatically from the username.

   Most edits are easier through admin.html, which rewrites this file.
   ------------------------------------------------------------------ */
`;

  function q(s) {
    return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }

  /* wrap a name list the way a human would: one line if it fits */
  function nameList(key, arr, indent) {
    const pad = " ".repeat(indent);
    if (!arr.length) return `${pad}${key}: [],`;
    const oneLine = `${pad}${key}: [${arr.map(q).join(", ")}],`;
    if (oneLine.length <= 76) return oneLine;
    return (
      `${pad}${key}: [\n` +
      arr.map((n) => `${pad}  ${q(n)},`).join("\n") +
      `\n${pad}],`
    );
  }

  function serialise() {
    const m = data.meta || {};
    const today = new Date().toISOString().slice(0, 10);

    let out = HEADER + "\nconst TIER_DATA = {\n  meta: {\n";
    out += `    title: ${q(m.title || "MCS")},\n`;
    out += `    subtitle: ${q(m.subtitle || "tier list")},\n`;
    out += `    updated: ${q(today)},\n`;
    out += "  },\n\n  tiers: [\n";

    data.tiers.forEach((t) => {
      out += "    {\n";
      out += `      tier: ${t.tier},\n`;
      out += `      color: ${q(t.color)},\n`;
      out += nameList("high", t.high || [], 6) + "\n";
      out += nameList("low", t.low || [], 6) + "\n";
      out += "    },\n";
    });

    out += "  ],\n\n";
    out += `  discord: ${q(data.discord || "")},\n`;
    out += "};\n";
    return out;
  }

  $("btn-export").addEventListener("click", async () => {
    const text = serialise();
    try {
      await navigator.clipboard.writeText(text);
      toast("data.js copied — paste it over the file on github", "ok");
    } catch {
      // clipboard blocked (needs https or a user gesture) — fall back
      const blob = new Blob([text], { type: "text/javascript" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "data.js";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("clipboard blocked — downloaded data.js instead");
    }
  });

  /* ── github ─────────────────────────────────────────────────── */

  const getToken = () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  };

  $("token-repo").textContent = CFG.repo || "the repo";

  function openToken() {
    $("token-input").value = getToken();
    $("token-overlay").hidden = false;
    $("token-input").focus();
  }

  $("token-close").addEventListener("click", () => ($("token-overlay").hidden = true));
  $("token-overlay").addEventListener("click", (e) => {
    if (e.target === $("token-overlay")) $("token-overlay").hidden = true;
  });

  $("token-save").addEventListener("click", () => {
    const v = $("token-input").value.trim();
    if (!v) return toast("paste a token first", "err");
    try {
      localStorage.setItem(TOKEN_KEY, v);
    } catch {
      return toast("this browser is blocking storage", "err");
    }
    $("token-overlay").hidden = true;
    toast("token saved to this browser", "ok");
    save();
  });

  $("token-forget").addEventListener("click", () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    $("token-input").value = "";
    toast("token removed from this browser");
  });

  /* base64 of a UTF-8 string — btoa alone mangles anything non-ASCII */
  function b64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }

  const API = "https://api.github.com/repos/";

  async function gh(path, opts) {
    const res = await fetch(API + CFG.repo + "/contents/" + path, {
      ...opts,
      headers: {
        Authorization: "Bearer " + getToken(),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts && opts.headers),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body.message || res.statusText;
      throw new Error(
        res.status === 401
          ? "token rejected (401) — it may be expired or wrong"
          : res.status === 403 || res.status === 404
          ? `no write access (${res.status}) — check the token has Contents: Read and write on ${CFG.repo}`
          : res.status === 409 || res.status === 422
          ? "someone else saved while you were editing — copy data.js to keep your edits, then reload"
          : `github said ${res.status}: ${msg}`
      );
    }
    return body;
  }

  function b64decode(s64) {
    const bin = atob(String(s64).replace(/\s/g, ""));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  /* Read the tier data out of a data.js the server gave us. It is the same
     file the public page already loads as a script, from our own repo. */
  function tiersOf(text) {
    try {
      const parsed = new Function(text + ";\nreturn TIER_DATA;")();
      return JSON.stringify(parsed.tiers);
    } catch {
      return null;
    }
  }

  async function save() {
    if (saving) return;
    if (!getToken()) return openToken();

    const btn = $("btn-save");
    saving = true;
    btn.disabled = true;
    btn.textContent = "saving…";

    /* Freeze exactly what is being committed. Edits made while the request is
       in flight must not be reported as saved. */
    const payload = serialise();
    const committed = JSON.stringify(data.tiers);
    const mark = history.length;

    try {
      const cur = await gh(CFG.path + "?ref=" + CFG.branch, { cache: "no-store" });

      /* The sha alone proves nothing here — we fetched it a moment ago, so it
         always matches and GitHub always accepts the write. The window that
         actually matters is page-load-to-save. So compare what the repo holds
         now against what it held when this copy was taken. */
      const remote = tiersOf(b64decode(cur.content));
      if (remote !== null && remote !== savedTiers) {
        throw new Error(
          "someone else saved since you opened this page — copy data.js to " +
            "keep your edits, then reload to get their version"
        );
      }

      await gh(CFG.path, {
        method: "PUT",
        body: JSON.stringify({
          message: "Update tier list via admin",
          content: b64(payload),
          sha: cur.sha,
          branch: CFG.branch,
        }),
      });

      savedTiers = committed;

      if (history.length === mark) {
        history.length = 0;
        setDirty(false);
        toast("saved — the live site updates in about a minute", "ok");
      } else {
        // edited while uploading: those edits are real but not yet committed
        recheckDirty();
        toast("saved, but you edited while it uploaded — save again", "ok");
      }
    } catch (err) {
      toast(String(err.message || err), "err");
      if (/401|403|404/.test(String(err.message))) openToken();
    } finally {
      saving = false;
      btn.textContent = "save to github";
      btn.disabled = !dirty;
    }
  }

  $("btn-save").addEventListener("click", save);

  /* ── change-password helper ─────────────────────────────────── */

  $("pw-input").addEventListener("input", async (e) => {
    const v = e.target.value;
    const out = $("pw-out");
    if (!v) return (out.hidden = true);
    out.hidden = false;
    out.textContent =
      '  passwordHash:\n    "' + (await sha256(v)) + '",';
  });

  /* ── keyboard ───────────────────────────────────────────────── */

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("edit-overlay").hidden) return closeEditor();
      if (!$("token-overlay").hidden) return ($("token-overlay").hidden = true);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (dirty && !saving) save();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      // a chip click leaves focus on a BUTTON, so `typing` alone would let
      // undo fire while the editor is open holding now-stale indices
      const dialogOpen = !$("edit-overlay").hidden || !$("token-overlay").hidden;
      if (!typing && !dialogOpen) {
        e.preventDefault();
        $("btn-undo").click();
      }
    }
  });

  setDirty(false);
})();
