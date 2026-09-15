import { colorByKey } from "@/lib/colors";

export function Avatar({
  nickname,
  image,
  colorKey,
  size = 36,
}: {
  nickname: string;
  image?: string;
  colorKey: string;
  size?: number;
}) {
  const color = colorByKey(colorKey);
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={nickname}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover"
        style={{ width: size, height: size, boxShadow: `0 0 0 2px ${color.hex}` }}
      />
    );
  }
  return (
    <span
      aria-label={nickname}
      className="inline-flex items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: color.hex,
        color: color.textOn === "white" ? "#FFFFFF" : "#000000",
        fontSize: size * 0.42,
      }}
    >
      {nickname.charAt(0).toUpperCase()}
    </span>
  );
}
