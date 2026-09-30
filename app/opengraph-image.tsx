import { ImageResponse } from "next/og";
import { C, OG_SIZE, Stub, Wordmark, ogFonts } from "@/lib/og";
import { SITE_URL } from "@/lib/site";
import { t } from "@/lib/i18n";

export const alt = `${t("app.name")} — ${t("app.tagline")}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: C.paper,
          fontFamily: "Geist",
          padding: "64px 72px",
          gap: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <Wordmark size={44} />
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <span style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.04, letterSpacing: "-0.035em", color: C.ink }}>
              {t("app.tagline")}
            </span>
            <span style={{ fontSize: 30, lineHeight: 1.4, color: C.ink2 }}>{t("app.pitch")}</span>
          </div>
          <span style={{ fontSize: 24, color: C.ink3 }}>{SITE_URL.replace(/^https?:\/\//, "")}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <Stub initial="H" color="#2BAB2B" label="Honza ti dluží" amount="412 Kč" action={t("debt.settle")} />
          <Stub initial="A" color="#5099E2" label="Aničce dlužíš" amount="180 Kč" amountColor={C.owe} action={t("debt.settle")} />
          <Stub initial="M" color="#F25AA6" label="Martin ti dluží" amount="96 Kč" action={t("debt.settle")} />
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
