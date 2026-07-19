import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12181F",
        panel: "#1B232C",
        line: "#2B3540",
        accent: "#E1A93B",
        good: "#4E9A6A",
        bad: "#C4573F",
        muted: "#8592A0",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
