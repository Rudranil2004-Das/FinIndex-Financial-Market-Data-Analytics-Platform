const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), panel: v("panel"), raised: v("raised"), line: v("line"),
        accent: v("accent"), ink: v("ink"), muted: v("muted"),
        up: "#22c55e", down: "#ef4444", warn: "#f59e0b",
      },
      fontFamily: { sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
