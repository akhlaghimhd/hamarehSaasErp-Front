/**
 * Subtle ERP icon field — low but visible opacity, irregular rotations.
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

const PLACEMENTS = [
  { top: "5%", left: "3%", rot: -18, size: 32 },
  { top: "10%", left: "20%", rot: 12, size: 26 },
  { top: "7%", left: "46%", rot: -8, size: 30 },
  { top: "12%", left: "70%", rot: 22, size: 28 },
  { top: "4%", left: "88%", rot: -14, size: 24 },
  { top: "26%", left: "6%", rot: 16, size: 28 },
  { top: "30%", left: "28%", rot: -24, size: 34 },
  { top: "24%", left: "55%", rot: 8, size: 26 },
  { top: "32%", left: "80%", rot: -12, size: 30 },
  { top: "46%", left: "2%", rot: 20, size: 26 },
  { top: "50%", left: "18%", rot: -6, size: 32 },
  { top: "44%", left: "42%", rot: 14, size: 28 },
  { top: "52%", left: "66%", rot: -20, size: 30 },
  { top: "48%", left: "90%", rot: 10, size: 24 },
  { top: "66%", left: "8%", rot: -16, size: 28 },
  { top: "70%", left: "34%", rot: 18, size: 32 },
  { top: "64%", left: "58%", rot: -10, size: 26 },
  { top: "72%", left: "82%", rot: 6, size: 30 },
  { top: "86%", left: "5%", rot: 12, size: 26 },
  { top: "88%", left: "26%", rot: -22, size: 28 },
  { top: "84%", left: "50%", rot: 8, size: 32 },
  { top: "90%", left: "74%", rot: -14, size: 24 },
  { top: "38%", left: "94%", rot: 24, size: 26 },
  { top: "16%", left: "94%", rot: -4, size: 22 },
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
              opacity: 0.07,
              transform: `rotate(${p.rot}deg)`,
            }}
            strokeWidth={1.35}
          />
        );
      })}
    </div>
  );
}
