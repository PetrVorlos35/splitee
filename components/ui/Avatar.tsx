import { colorByKey } from "@/lib/colors";

/**
 * Identita člena: jeho barva jako výplň, iniciála. Host (bez účtu) má bílou
 * výplň a čárkovaný okraj ve své barvě — je to „nevyplněné políčko“, které
 * si někdo později převezme.
 */
export function Avatar({
  nickname,
  image,
  colorKey,
  isGuest = false,
  size = 36,
}: {
  nickname: string;
  image?: string;
  colorKey: string;
  isGuest?: boolean;
  size?: number;
}) {
  const color = colorByKey(colorKey);
  const initial = nickname.trim().charAt(0).toUpperCase() || "?";

  if (image && !isGuest) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${color.hex}` }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        ...(isGuest
          ? { backgroundColor: "#fff", color: color.hex, border: `1.5px dashed ${color.hex}` }
          : { backgroundColor: color.hex, color: color.textOn === "white" ? "#fff" : "#15181c" }),
      }}
    >
      {initial}
    </span>
  );
}
