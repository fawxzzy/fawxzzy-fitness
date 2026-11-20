import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "pb-[calc(var(--app-bottom-action-bar-height,120px)+env(safe-area-inset-bottom,0px)+3px)]",
  ],
  theme: {
    extend: {
      colors: {
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-strong": "rgb(var(--accent-strong) / <alpha-value>)",
      },
      // Exercise card motion (docs/design-system/CARD-SYSTEM.md section 3.3). Every user of these pairs them with
      // `motion-reduce:animate-none`, so reduced motion shows the final, still state.
      keyframes: {
        "exercise-done-pop": {
          "0%": { transform: "scale(0.55)", opacity: "0" },
          "60%": { transform: "scale(1.14)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "exercise-done-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--success-rgb) / 0)" },
          "50%": { boxShadow: "0 0 0 4px rgb(var(--success-rgb) / 0.16), 0 0 14px 2px rgb(var(--success-rgb) / 0.32)" },
        },
        "exercise-glint": {
          "0%": { transform: "translateX(-140%) skewX(-18deg)", opacity: "0" },
          "20%": { opacity: "0.9" },
          "60%, 100%": { transform: "translateX(260%) skewX(-18deg)", opacity: "0" },
        },
        "promote-rise": {
          "0%": { transform: "translateY(12px) scale(0.94)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
      },
      animation: {
        "exercise-done": "exercise-done-pop 420ms cubic-bezier(0.22, 1, 0.36, 1) both, exercise-done-glow 2.4s ease-in-out 420ms 3",
        "exercise-glint": "exercise-glint 2.8s ease-in-out infinite",
        "promote-rise": "promote-rise 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
