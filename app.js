/* ==================================================================
   soccer — tier list
   renders TIER_DATA (see data.js) into columns.
   ================================================================== */

(function () {
  "use strict";

  /* ── error banner ───────────────────────────────────────────────
     data.js is hand-edited, so a stray comma blanks the whole board
     with no visible cause. Say so on the page instead.             */

  function panic(msg) {
    const board = document.querySelector(".board") || document.body;
    const box = document.createElement("div");
    box.className = "panic";
    box.innerHTML =
      "<b>the tier list could not load</b>" +
      "<span>" +
      String(msg).replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;")) +
      "</span>" +
      "<span class=\"panic-hint\">check <code>data.js</code> for a missing " +
      "comma, bracket or quote — then reload.</span>";
    board.prepend(box); // .columns is flex:1, so append would sink it
  }

  function boot() {
  const D = TIER_DATA;
  const $ = (id) => document.getElementById(id);

  const columnsEl = $("columns");
  const railCount = $("rail-count");

  /* ── avatar sources, tried in order ─────────────────────────── */

  const HEAD = [
    (n) => `https://mc-heads.net/avatar/${encodeURIComponent(n)}/48`,
    (n) => `https://minotar.net/helm/${encodeURIComponent(n)}/48`,
    () =>
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#2a2a31"/><rect x="1" y="2" width="1.6" height="1.6" fill="#4a4a55"/><rect x="5.4" y="2" width="1.6" height="1.6" fill="#4a4a55"/><rect x="2" y="5" width="4" height="1" fill="#4a4a55"/></svg>`
      ),
  ];

  function attachHead(img, name) {
    let i = 0;
    img.src = HEAD[i](name);
    img.addEventListener("error", function onErr() {
      i += 1;
      if (i < HEAD.length) img.src = HEAD[i](name);
      else img.removeEventListener("error", onErr);
    });
  }

  /* ── flatten: every player, in ranked order ─────────────────── */

  const players = [];
  D.tiers.forEach((t) => {
    ["high", "low"].forEach((band) => {
      (t[band] || []).forEach((name) => {
        players.push({
          name,
          tier: t.tier,
          band,
          color: t.color,
          rank: (band === "high" ? "HT" : "LT") + t.tier,
        });
      });
    });
  });
  players.forEach((p, i) => (p.pos = i + 1));

  railCount.textContent = String(players.length);
  railCount.title = players.length + " ranked players";

  /* Failsafe: opacity 0 is only safe because something clears .reveal. If the
     animation is cancelled or never fires its end event, strip it anyway so a
     row can never be left invisible. */
  setTimeout(() => {
    document
      .querySelectorAll(".row.reveal")
      .forEach((r) => r.classList.remove("reveal"));
  }, 3000);


  /* ── build the board ────────────────────────────────────────── */

  const rowIndex = []; // { el, player }

  D.tiers.forEach((t, ti) => {
    const col = document.createElement("section");
    col.className = "col";
    col.style.setProperty("--c", t.color);
    col.dataset.tier = String(t.tier);

    const head = document.createElement("header");
    head.className = "col-head";
    head.innerHTML = `<span class="col-title">tier ${t.tier}</span>`;
    col.appendChild(head);

    const body = document.createElement("div");
    body.className = "col-body";

    ["high", "low"].forEach((bandKey) => {
      const list = t[bandKey] || [];

      const band = document.createElement("div");
      band.className = "band " + bandKey;
      band.dataset.band = bandKey;

      if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "band-empty";
        empty.textContent = "—";
        band.appendChild(empty);
      }

      list.forEach((name, i) => {
        const p = players.find(
          (x) => x.name === name && x.tier === t.tier && x.band === bandKey
        );

        const row = document.createElement("div");
        row.className = "row reveal";
        row.style.animationDelay = ti * 45 + i * 22 + "ms";
        const unreveal = () => row.classList.remove("reveal");
        row.addEventListener("animationend", unreveal, { once: true });
        row.addEventListener("animationcancel", unreveal, { once: true });
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.title = `${name} — ${p.rank}`;

        const img = document.createElement("img");
        img.className = "row-head";
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        attachHead(img, name);

        const nm = document.createElement("span");
        nm.className = "row-name";
        nm.textContent = name;

        row.append(img, nm);
        row.addEventListener("click", () => openCard(p));
        row.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openCard(p);
          }
        });

        band.appendChild(row);
        rowIndex.push({ el: row, player: p });
      });

      body.appendChild(band);
    });

    col.appendChild(body);
    columnsEl.appendChild(col);
  });

  /* ── search ─────────────────────────────────────────────────── */

  const searchbar = $("searchbar");
  const searchInput = $("search-input");
  const searchHint = $("search-hint");
  const btnSearch = $("btn-search");

  function setSearch(open) {
    searchbar.hidden = !open;
    btnSearch.classList.toggle("is-on", open);
    if (open) searchInput.focus();
    else {
      searchInput.value = "";
      applySearch();
    }
  }

  function applySearch() {
    const q = searchInput.value.trim().toLowerCase();
    let hits = 0;

    rowIndex.forEach(({ el, player }) => {
      if (!q) {
        el.classList.remove("is-dim", "is-hit");
        return;
      }
      const hit = player.name.toLowerCase().includes(q);
      el.classList.toggle("is-hit", hit);
      el.classList.toggle("is-dim", !hit);
      if (hit) hits += 1;
    });

    searchHint.textContent = q ? `${hits} match${hits === 1 ? "" : "es"}` : "";

    if (q && hits) {
      // scroll the owning column only — scrollIntoView would also drag the
      // horizontal board scroll and yank other columns out of view
      const first = rowIndex.find((r) => r.el.classList.contains("is-hit"));
      const body = first && first.el.closest(".col-body");
      if (body) {
        body.scrollTop = Math.max(
          0,
          first.el.offsetTop - body.clientHeight / 2
        );
      }
    }
  }

  btnSearch.addEventListener("click", () => setSearch(searchbar.hidden));
  $("search-close").addEventListener("click", () => setSearch(false));
  searchInput.addEventListener("input", applySearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setSearch(false);
    if (e.key === "Enter") {
      const first = rowIndex.find((r) => r.el.classList.contains("is-hit"));
      if (first) openCard(first.player);
    }
  });

  /* ── filters ────────────────────────────────────────────────── */

  const filterbar = $("filterbar");
  const btnFilter = $("btn-filter");
  const tierChips = $("tier-chips");

  D.tiers.forEach((t) => {
    const chip = document.createElement("button");
    chip.className = "chip is-on";
    chip.dataset.tier = String(t.tier);
    chip.style.setProperty("--c", t.color);
    chip.textContent = "t" + t.tier;
    tierChips.appendChild(chip);
  });

  filterbar.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    chip.classList.toggle("is-on");
    applyFilters();
  });

  function applyFilters() {
    const onTiers = new Set(
      [...filterbar.querySelectorAll(".chip[data-tier].is-on")].map(
        (c) => c.dataset.tier
      )
    );
    const onBands = new Set(
      [...filterbar.querySelectorAll(".chip[data-band].is-on")].map(
        (c) => c.dataset.band
      )
    );

    columnsEl.querySelectorAll(".col").forEach((col) => {
      col.classList.toggle("is-hidden", !onTiers.has(col.dataset.tier));
    });
    columnsEl.querySelectorAll(".band").forEach((band) => {
      band.classList.toggle("is-hidden", !onBands.has(band.dataset.band));
    });
  }

  btnFilter.addEventListener("click", () => {
    filterbar.hidden = !filterbar.hidden;
    btnFilter.classList.toggle("is-on", !filterbar.hidden);
  });

  /* ── discord link ───────────────────────────────────────────── */

  const discord = $("btn-discord");
  if (D.discord) {
    discord.href = D.discord;
    discord.target = "_blank";
    discord.rel = "noopener noreferrer";
  } else {
    discord.removeAttribute("href");
    discord.setAttribute("aria-disabled", "true");
    discord.title = "Discord — add your invite link in data.js";
  }

  /* ── player card ────────────────────────────────────────────── */

  const overlay = $("overlay");
  const card = $("card");

  function openCard(p) {
    if (!p) return;
    card.style.setProperty("--c", p.color);
    $("card-rank").textContent = p.rank;
    $("card-name").textContent = p.name;
    $("card-meta").innerHTML =
      `<i>tier</i> &nbsp;${p.tier} · ${p.band} tier<br>` +
      `<i>overall</i> &nbsp;#${p.pos} of ${players.length}`;
    $("card-namemc").href =
      "https://namemc.com/profile/" + encodeURIComponent(p.name);

    const skin = $("card-skin");
    skin.alt = p.name;
    skin.src = `https://mc-heads.net/body/${encodeURIComponent(p.name)}/140`;
    skin.onerror = () => {
      skin.onerror = null;
      skin.src = `https://minotar.net/armor/body/${encodeURIComponent(p.name)}/140.png`;
    };

    overlay.hidden = false;
  }

  function closeCard() {
    overlay.hidden = true;
  }

  $("card-close").addEventListener("click", closeCard);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCard();
  });

  /* ── keyboard ───────────────────────────────────────────────── */

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!overlay.hidden) return closeCard();
      if (!searchbar.hidden) return setSearch(false);
    }
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (!typing && (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key === "k"))) {
      e.preventDefault();
      setSearch(true);
    }
  });

  /* ── title ──────────────────────────────────────────────────── */

  if (D.meta && D.meta.title) {
    document.title = D.meta.title;
  }
  }

  /* ── go ─────────────────────────────────────────────────────── */

  try {
    if (typeof TIER_DATA === "undefined") {
      panic("data.js did not define TIER_DATA (it probably failed to parse).");
    } else if (!Array.isArray(TIER_DATA.tiers) || !TIER_DATA.tiers.length) {
      panic("data.js loaded, but TIER_DATA.tiers is empty.");
    } else {
      boot();
    }
  } catch (err) {
    panic((err && err.message) || err);
  }
})();
