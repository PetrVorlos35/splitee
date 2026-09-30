import { readFile } from "node:fs/promises";
import path from "node:path";

// Sdílené kusy OG obrázků (next/og, Satori). Satori umí jen inline styly a
// flexbox, proto tu nejsou Tailwind třídy. Barvy odpovídají app/globals.css.
export const OG_SIZE = { width: 1200, height: 630 };

export const C = {
  paper: "#f3f6f8",
  sheet: "#ffffff",
  ink: "#15181c",
  ink2: "#4b5569",
  ink3: "#6f7a8e",
  rule: "#c9d3e8",
  ruleSoft: "#e3e8f3",
  form: "#1f3a93",
  formSoft: "#e5eaf6",
  formDeep: "#172c70",
  owe: "#a8321f",
};

// Fonty leží v assets/fonts (v standalone buildu je tam dostane
// outputFileTracingIncludes v next.config.ts). Výchozí font next/og neumí
// českou diakritiku.
export async function ogFonts() {
  const dir = path.join(process.cwd(), "assets/fonts");
  const [medium, semibold, mono] = await Promise.all([
    readFile(path.join(dir, "Geist-Medium.ttf")),
    readFile(path.join(dir, "Geist-SemiBold.ttf")),
    readFile(path.join(dir, "GeistMono-Medium.ttf")),
  ]);
  return [
    { name: "Geist", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 500 as const, style: "normal" as const },
  ];
}

/** Ikona appky (výsečový kruh z public/icon.svg) bez bílého podkladu. */
export function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <g transform="rotate(-90 256 256)" fill="none" strokeWidth="88">
        <circle cx="256" cy="256" r="170" stroke="#F25A5A" strokeDasharray="534.0708 534.0708" strokeDashoffset="0" />
        <circle cx="256" cy="256" r="170" stroke="#5099E2" strokeDasharray="320.4425 747.6990" strokeDashoffset="-534.0708" />
        <circle cx="256" cy="256" r="170" stroke="#A65AF2" strokeDasharray="213.6283 854.5132" strokeDashoffset="-854.5133" />
      </g>
    </svg>
  );
}

export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.35 }}>
      <Logo size={size} />
      <span style={{ fontSize: size * 0.8, fontWeight: 600, letterSpacing: "-0.01em", color: C.ink }}>Splitee</span>
    </div>
  );
}

/** Ústřižek s dluhem — stejný motiv jako SampleStub na úvodní obrazovce. */
export function Stub({
  initial,
  color,
  label,
  amount,
  action,
  amountColor = C.ink,
}: {
  initial: string;
  color: string;
  label: string;
  amount: string;
  action: string;
  amountColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: C.sheet,
        border: `2px solid ${C.rule}`,
        borderRadius: 8,
        width: 470,
      }}
    >
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 20, padding: "24px 0 24px 28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 60,
            height: 60,
            borderRadius: 30,
            background: color,
            fontSize: 26,
            fontWeight: 600,
            color: C.ink,
          }}
        >
          {initial}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 24, fontWeight: 500, color: C.ink }}>{label}</span>
          <span style={{ fontSize: 34, fontFamily: "Geist Mono", color: amountColor }}>{amount}</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          borderLeft: `3px dashed ${C.rule}`,
          margin: "14px 0",
          fontSize: 22,
          fontWeight: 600,
          color: C.form,
        }}
      >
        {action}
      </div>
    </div>
  );
}
