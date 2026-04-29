const FALLBACK_COLORS = [
  ["#FF6B6B", "#A82B2B"],
  ["#4ECDC4", "#1F7873"],
  ["#45B7D1", "#1B6987"],
  ["#96CEB4", "#3F8763"],
  ["#6C5CE7", "#322598"],
  ["#DDA0DD", "#7E4F7E"],
  ["#00B894", "#005641"],
  ["#F7DC6F", "#A88A1B"],
  ["#BB8FCE", "#683B7F"],
  ["#0984E3", "#04477A"],
  ["#F8C471", "#A8721B"],
  ["#00CEC9", "#006C69"],
  ["#E17055", "#7C2C16"],
  ["#74B9FF", "#1E5FA8"],
  ["#A29BFE", "#4B45A1"],
  ["#55EFC4", "#208E68"],
  ["#FAD7A0", "#A8761F"],
  ["#81ECEC", "#287D7D"],
  ["#FD79A8", "#9B1F4D"],
  ["#636E72", "#2D3437"],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function fallbackGradient(name: string): { from: string; to: string } {
  const [from, to] = FALLBACK_COLORS[hash(name) % FALLBACK_COLORS.length];
  return { from, to };
}

export function initials(name: string): string {
  const words = name.replace(/[-_]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return name[0]?.toUpperCase() ?? "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function clsx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
