/**
 * Subtle ERP icon field — fewer icons, clearer spacing, visible opacity.
 */

"use client";

import {
  Package,
  Warehouse,
  Calculator,
  Users,
  BarChart3,
  Building2,
  Truck,
  FileText,
  Settings,
  Layers,
  ShoppingCart,
  Boxes,
} from "lucide-react";

const ICONS = [
  Package,
  Warehouse,
  Calculator,
  Users,
  BarChart3,
  Building2,
  Truck,
  FileText,
  Settings,
  Layers,
  ShoppingCart,
  Boxes,
];

/** 12 icons — less clutter, still fills the page */
const PLACEMENTS = [
  { top: "8%", left: "6%", rot: -16, size: 30 },
  { top: "10%", left: "42%", rot: 10, size: 26 },
  { top: "7%", left: "78%", rot: -12, size: 28 },
  { top: "28%", left: "12%", rot: 18, size: 28 },
  { top: "30%", left: "55%", rot: -8, size: 32 },
  { top: "26%", left: "88%", rot: 14, size: 24 },
  { top: "52%", left: "5%", rot: -20, size: 28 },
  { top: "50%", left: "38%", rot: 6, size: 30 },
  { top: "54%", left: "72%", rot: -14, size: 26 },
  { top: "76%", left: "15%", rot: 12, size: 28 },
  { top: "78%", left: "48%", rot: -10, size: 30 },
  { top: "74%", left: "82%", rot: 8, size: 26 },
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
            className="absolute text-foreground"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              opacity: 0.08,
              transform: `rotate(${p.rot}deg)`,
            }}
            strokeWidth={1.35}
          />
        );
      })}
    </div>
  );
}
