/**
 * Subtle ERP icon field — duotone-style Lucide icons, very low opacity,
 * irregular rotations. Decorative only.
 */

"use client";

import {
  Package,
  Warehouse,
  Calculator,
  Users,
  BarChart3,
  ClipboardList,
  Building2,
  Truck,
  FileText,
  Settings,
  Layers,
  PieChart,
  ShoppingCart,
  Boxes,
  Landmark,
  Network,
} from "lucide-react";

const ICONS = [
  Package,
  Warehouse,
  Calculator,
  Users,
  BarChart3,
  ClipboardList,
  Building2,
  Truck,
  FileText,
  Settings,
  Layers,
  PieChart,
  ShoppingCart,
  Boxes,
  Landmark,
  Network,
];

/** Deterministic-ish positions so SSR/client match */
const PLACEMENTS = [
  { top: "6%", left: "4%", rot: -18, size: 28 },
  { top: "12%", left: "22%", rot: 12, size: 22 },
  { top: "8%", left: "48%", rot: -8, size: 26 },
  { top: "14%", left: "72%", rot: 22, size: 24 },
  { top: "5%", left: "90%", rot: -14, size: 20 },
  { top: "28%", left: "8%", rot: 16, size: 24 },
  { top: "32%", left: "30%", rot: -24, size: 30 },
  { top: "26%", left: "58%", rot: 8, size: 22 },
  { top: "34%", left: "82%", rot: -12, size: 26 },
  { top: "48%", left: "3%", rot: 20, size: 22 },
  { top: "52%", left: "20%", rot: -6, size: 28 },
  { top: "46%", left: "44%", rot: 14, size: 24 },
  { top: "54%", left: "68%", rot: -20, size: 26 },
  { top: "50%", left: "92%", rot: 10, size: 20 },
  { top: "68%", left: "10%", rot: -16, size: 24 },
  { top: "72%", left: "36%", rot: 18, size: 28 },
  { top: "66%", left: "60%", rot: -10, size: 22 },
  { top: "74%", left: "84%", rot: 6, size: 26 },
  { top: "88%", left: "6%", rot: 12, size: 22 },
  { top: "90%", left: "28%", rot: -22, size: 24 },
  { top: "86%", left: "52%", rot: 8, size: 28 },
  { top: "92%", left: "76%", rot: -14, size: 20 },
  { top: "40%", left: "95%", rot: 24, size: 22 },
  { top: "18%", left: "95%", rot: -4, size: 18 },
];

export function LoginBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {PLACEMENTS.map((p, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <Icon
            key={i}
            className="absolute text-primary"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              opacity: 0.045,
              transform: `rotate(${p.rot}deg)`,
            }}
            strokeWidth={1.25}
          />
        );
      })}
    </div>
  );
}
