const stableStringify = (value) => {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `"${key}":${stableStringify(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
};

export const CLUB_THEME_PRESETS = [
  {
    id: "default",
    name: "Default",
    description: "Classic CBC palette",
    preview: {
      light: {
        primary: "#5D473A",
        secondary: "#BFA480",
        background: "#F5F1EA",
        accent: "#D19A3E",
      },
      dark: {
        primary: "#5D473A",
        secondary: "#BFA480",
        background: "#1F1A16",
        accent: "#D19A3E",
      },
    },
    overrides: {
      light: {},
      dark: {
        palette: {
          mode: "dark",
          background: { default: "#241E19", paper: "#2F2720" },
          text: { primary: "#F9F5EF", secondary: "#E4D6C7" },
          divider: "rgba(255,255,255,0.12)",
        },
      },
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Earthy greens and warm accents",
    preview: {
      light: {
        primary: "#2F5D50",
        secondary: "#A7C4A0",
        background: "#F3F6F2",
        accent: "#C97C5D",
      },
      dark: {
        primary: "#2F5D50",
        secondary: "#A7C4A0",
        background: "#17201C",
        accent: "#C97C5D",
      },
    },
    overrides: {
      light: {
        palette: {
          primary: { main: "#2F5D50" },
          secondary: { main: "#A7C4A0" },
          background: { default: "#F3F6F2" },
          accent: { main: "#C97C5D" },
          info: { main: "#3E6B6F" },
          success: { main: "#3F7D5A" },
          warning: { main: "#D08B5B" },
          error: { main: "#B35A4F" },
        },
      },
      dark: {
        palette: {
          mode: "dark",
          primary: { main: "#2F5D50" },
          secondary: { main: "#A7C4A0" },
          accent: { main: "#C97C5D" },
          info: { main: "#3E6B6F" },
          success: { main: "#3F7D5A" },
          warning: { main: "#D08B5B" },
          error: { main: "#B35A4F" },
          background: { default: "#1C2622", paper: "#25322C" },
          text: { primary: "#EEF5F0", secondary: "#CBD8D0" },
          divider: "rgba(255,255,255,0.12)",
        },
      },
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm terracotta and soft peach",
    preview: {
      light: {
        primary: "#8C3B2E",
        secondary: "#F0B79B",
        background: "#FFF3EB",
        accent: "#E09F3E",
      },
      dark: {
        primary: "#8C3B2E",
        secondary: "#F0B79B",
        background: "#231A18",
        accent: "#E09F3E",
      },
    },
    overrides: {
      light: {
        palette: {
          primary: { main: "#8C3B2E" },
          secondary: { main: "#F0B79B" },
          background: { default: "#FFF3EB" },
          accent: { main: "#E09F3E" },
          warning: { main: "#E08A4B" },
          info: { main: "#C06A4F" },
          success: { main: "#7A9B6A" },
          error: { main: "#B04A3A" },
        },
      },
      dark: {
        palette: {
          mode: "dark",
          primary: { main: "#8C3B2E" },
          secondary: { main: "#F0B79B" },
          accent: { main: "#E09F3E" },
          warning: { main: "#E08A4B" },
          info: { main: "#C06A4F" },
          success: { main: "#7A9B6A" },
          error: { main: "#B04A3A" },
          background: { default: "#241C19", paper: "#2E2320" },
          text: { primary: "#F7EEE7", secondary: "#DEC8BD" },
          divider: "rgba(255,255,255,0.12)",
        },
      },
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool blues with teal highlights",
    preview: {
      light: {
        primary: "#1E4E5D",
        secondary: "#8FC6D1",
        background: "#EEF6F8",
        accent: "#2E8FA1",
      },
      dark: {
        primary: "#1E4E5D",
        secondary: "#8FC6D1",
        background: "#152026",
        accent: "#2E8FA1",
      },
    },
    overrides: {
      light: {
        palette: {
          primary: { main: "#1E4E5D" },
          secondary: { main: "#8FC6D1" },
          background: { default: "#EEF6F8" },
          accent: { main: "#2E8FA1" },
          info: { main: "#277589" },
          success: { main: "#3C8B78" },
          warning: { main: "#D2A45B" },
          error: { main: "#B35A5A" },
        },
      },
      dark: {
        palette: {
          mode: "dark",
          primary: { main: "#1E4E5D" },
          secondary: { main: "#8FC6D1" },
          accent: { main: "#2E8FA1" },
          info: { main: "#277589" },
          success: { main: "#3C8B78" },
          warning: { main: "#D2A45B" },
          error: { main: "#B35A5A" },
          background: { default: "#18242A", paper: "#213039" },
          text: { primary: "#E8F4F7", secondary: "#C6D9DE" },
          divider: "rgba(255,255,255,0.12)",
        },
      },
    },
  },
  {
    id: "lilac",
    name: "Lilac",
    description: "Soft violet and muted neutrals",
    preview: {
      light: {
        primary: "#5B4E7A",
        secondary: "#C2B4DD",
        background: "#F5F2FA",
        accent: "#8B6EA5",
      },
      dark: {
        primary: "#5B4E7A",
        secondary: "#C2B4DD",
        background: "#1D1A23",
        accent: "#8B6EA5",
      },
    },
    overrides: {
      light: {
        palette: {
          primary: { main: "#5B4E7A" },
          secondary: { main: "#C2B4DD" },
          background: { default: "#F5F2FA" },
          accent: { main: "#8B6EA5" },
          info: { main: "#6F5B9B" },
          success: { main: "#6D8B7A" },
          warning: { main: "#D1A24F" },
          error: { main: "#B35B6A" },
        },
      },
      dark: {
        palette: {
          mode: "dark",
          primary: { main: "#5B4E7A" },
          secondary: { main: "#C2B4DD" },
          accent: { main: "#8B6EA5" },
          info: { main: "#6F5B9B" },
          success: { main: "#6D8B7A" },
          warning: { main: "#D1A24F" },
          error: { main: "#B35B6A" },
          background: { default: "#211E28", paper: "#2A2434" },
          text: { primary: "#F0ECF7", secondary: "#D4CAE5" },
          divider: "rgba(255,255,255,0.12)",
        },
      },
    },
  },
];

export const getPresetForOverrides = (overrides = {}) => {
  const serializedOverrides = stableStringify(overrides || {});

  for (const preset of CLUB_THEME_PRESETS) {
    const lightMatch = stableStringify(preset.overrides?.light || {}) === serializedOverrides;
    if (lightMatch) {
      return { preset, mode: "light" };
    }
    const darkMatch = stableStringify(preset.overrides?.dark || {}) === serializedOverrides;
    if (darkMatch) {
      return { preset, mode: "dark" };
    }
  }

  return null;
};
