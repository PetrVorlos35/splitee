import { ImageResponse } from "next/og";
import { C, OG_SIZE, Wordmark, ogFonts } from "@/lib/og";
import { people, t } from "@/lib/i18n";
import { invitePreview } from "./preview";

export const alt = t("join.title");
export const size = OG_SIZE;
export const contentType = "image/png";

function nameSize(name: string) {
  if (name.length <= 14) return 84;
  if (name.length <= 22) return 68;
  return 54;
}

/** Náhled pozvánky v chatu: tiskopis s emoji, názvem party a kódem. */
export default async function InviteImage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const preview = await invitePreview(code);
  const normalized = code.trim().toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: C.form,
          fontFamily: "Geist",
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            background: C.sheet,
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "44px 56px 36px", gap: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.1em", color: C.ink3 }}>
                {t("join.title").toUpperCase()}
              </span>
              <Wordmark size={36} />
            </div>

            {preview ? (
              <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 36 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 168,
                    height: 168,
                    flexShrink: 0,
                    border: `2px solid ${C.rule}`,
                    borderRadius: 8,
                    background: C.paper,
                    fontSize: 104,
                  }}
                >
                  {preview.emoji}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: nameSize(preview.name),
                      fontWeight: 600,
                      lineHeight: 1.05,
                      letterSpacing: "-0.03em",
                      color: C.ink,
                    }}
                  >
                    {preview.name}
                  </span>
                  <span style={{ fontSize: 30, color: C.ink2 }}>
                    {t("join.memberCount", { people: people(preview.memberCount) })}
                  </span>
                </div>
              </div>
            ) : (
              <span style={{ display: "flex", flex: 1, alignItems: "center", fontSize: 72, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em", color: C.ink }}>
                {t("join.og.generic")}
              </span>
            )}
          </div>

          {/* perforace ústřižku */}
          <div style={{ display: "flex", borderTop: `3px dashed ${C.rule}`, margin: "0 24px" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 56px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: preview ? 1 : 0 }}>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.1em", color: C.ink3 }}>
                {t("group.code.label").toUpperCase()}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {normalized.slice(0, 6).split("").map((ch, i) => (
                  <span
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 50,
                      height: 60,
                      border: `2px solid ${C.rule}`,
                      borderRadius: 4,
                      fontFamily: "Geist Mono",
                      fontSize: 32,
                      color: C.ink,
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                height: 64,
                padding: "0 32px",
                borderRadius: 6,
                background: C.form,
                color: "#ffffff",
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {t("join.og.cta")}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts(), emoji: "twemoji" },
  );
}
