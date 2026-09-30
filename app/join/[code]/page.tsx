import type { Metadata } from "next";
import { people, t } from "@/lib/i18n";
import { OPEN_GRAPH_BASE } from "@/lib/site";
import { JoinClient } from "./JoinClient";
import { invitePreview } from "./preview";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const preview = await invitePreview(code);

  const title = preview ? t("join.meta.title", { emoji: preview.emoji, name: preview.name }) : t("join.title");
  const description = preview
    ? t("join.meta.description", { people: people(preview.memberCount) })
    : t("join.meta.descriptionGeneric");

  return {
    title,
    description,
    // pozvánky jsou soukromé — náhled v chatu ano, ve vyhledávači ne
    robots: { index: false, follow: false },
    alternates: { canonical: `/join/${code}` },
    openGraph: { ...OPEN_GRAPH_BASE, title, description, url: `/join/${code}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function JoinPage() {
  return <JoinClient />;
}
