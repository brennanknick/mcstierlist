/* ------------------------------------------------------------------
   TIER LIST DATA
   ------------------------------------------------------------------
   This is the only file you need to edit to update the tier list.

   Each tier has a `high` array and a `low` array. Put the player's
   exact Minecraft username in quotes, separated by commas.
   Head avatars are fetched automatically from the username.

   Example:
     { tier: 3, color: "#ff5f6d", high: ["Notch", "Dinnerbone"], low: [] }
   ------------------------------------------------------------------ */

const TIER_DATA = {
  meta: {
    title: "MCS",
    subtitle: "tier list",
    updated: "2026-09-16",
  },

  tiers: [
    {
      tier: 1,
      color: "#ffcf4a",
      high: ["DuckyWins", "MrTpot", "Cozyyy"],
      low: ["Chaseler"],
    },
    {
      tier: 2,
      color: "#ff9a3c",
      high: [],
      low: ["Sflucx"],
    },
    {
      tier: 3,
      color: "#ff5f6d",
      high: ["xdColdClaw"],
      low: ["AadenOh", "Saintzdid"],
    },
    {
      tier: 4,
      color: "#c084fc",
      high: ["S8ns", "DrDillon", "2XXS", "imnathy", "DarkClip"],
      low: ["ScarIsBad", "CluLessBird", "Rouadian"],
    },
    {
      tier: 5,
      color: "#5b9dff",
      high: ["MrBabbs", "Xeillious", "Hedrix"],
      low: ["HiveG", "Gagerade_", "StreetQ", "Luvo_", "Belone132", "Zeke"],
    },
    {
      tier: 6,
      color: "#2dd4bf",
      high: ["Frogmoney", "Samygain"],
      low: ["Topothetop"],
    },
    {
      tier: 7,
      color: "#8b96a5",
      high: ["Bob", "Larpza", "Macy", "Striker"],
      low: [
        "RoseRocket",
        "President",
        "TGGC",
        "CoolestGreen",
        "Orange",
        "IceFox",
        "SixEyedJoker",
        "Imabibee",
      ],
    },
  ],

  // Optional: put your Discord invite here to make the sidebar icon live.
  discord: "",
};
