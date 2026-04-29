const FALLBACK_COLORS = [
  ["#da7756", "#a84a2a"],  // Claude orange
  ["#c4956a", "#8a5530"],  // Terracotta
  ["#b57a55", "#7a4525"],  // Burnt sienna
  ["#c4a455", "#8a6a25"],  // Warm gold
  ["#8b7355", "#5a4530"],  // Warm brown
  ["#9b8a7a", "#6a5545"],  // Taupe
  ["#6b8f71", "#3d5c42"],  // Muted sage
  ["#7aab8f", "#3d7a5c"],  // Muted teal
  ["#8f9b7a", "#5a6a45"],  // Olive
  ["#7aab9b", "#3d7868"],  // Seafoam
  ["#8b6fa0", "#5a4070"],  // Warm mauve
  ["#9b7fa8", "#6a4a78"],  // Soft purple
  ["#8f7aaa", "#5a4578"],  // Lavender
  ["#b57878", "#7a4545"],  // Muted rose
  ["#b57a8f", "#7a4560"],  // Dusty rose
  ["#aa7878", "#7a4545"],  // Clay
  ["#7a9ab5", "#4a6a85"],  // Warm blue-gray
  ["#7888b5", "#4a5585"],  // Periwinkle
  ["#7a8a9b", "#4a5a6b"],  // Slate
  ["#c49b7a", "#8a6040"],  // Sand
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
