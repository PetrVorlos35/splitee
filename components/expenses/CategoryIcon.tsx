import { Car, House, PartyPopper, ShoppingBag, ShoppingCart, Tag, Utensils, type LucideIcon } from "lucide-react";

/**
 * Kreslená ikona kategorie. V databázi je u kategorie emoji (convex/categories.ts),
 * ale v UI jedna sada ikon jednou tloušťkou čáry — mapuje se podle názvu
 * výchozích kategorií, cokoli jiného dostane obecný štítek.
 */
const BY_NAME: Record<string, LucideIcon> = {
  Jídlo: Utensils,
  Potraviny: ShoppingCart,
  Doprava: Car,
  Bydlení: House,
  Zábava: PartyPopper,
  Nákupy: ShoppingBag,
  Ostatní: Tag,
};

export function CategoryIcon({ name, size = 18 }: { name?: string; size?: number }) {
  const Icon = (name && BY_NAME[name]) || Tag;
  return <Icon size={size} strokeWidth={1.8} aria-hidden />;
}
