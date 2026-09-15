/**
 * Avatar pick → crop (zoom/pan) → confirm → returns File for upload.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Loader2 } from "lucide-react";

const OUTPUT_SIZE = 512;

export function AvatarCropDialog({
  open,
  file,
  onOpenChange,
  onConfirm,
  busy,
}: {
  open: boolean;
  file: File | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cropped: File) => void | Promise<void>;
  busy?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const buildCroppedFile = useCallback(async (): Promise<File | null> => {
    const img = imgRef.current;
    if (!img || !file) return null;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Viewport is 280×280 circle area in dialog
    const view = 280;
    const scale = (Math.max(view / img.naturalWidth, view / img.naturalHeight) * zoom);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const dx = (view - drawW) / 2 + offset.x;
    const dy = (view - drawH) / 2 + offset.y;

    // Map viewport crop square to source image
    const sx = (-dx) / scale;
    const sy = (-dy) / scale;
    const sw = view / scale;
    const sh = view / scale;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) return null;

    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  }, [file, offset.x, offset.y, zoom]);

  const handleConfirm = async () => {
    setError(null);
    const cropped = await buildCroppedFile();
    if (!cropped) {
      setError("برش تصویر ناموفق بود.");
      return;
    }
    if (cropped.size > 2 * 1024 * 1024) {
      setError("حجم تصویر پس از برش بیش از ۲ مگابایت است.");
      return;
    }
    await onConfirm(cropped);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ویرایش تصویر پروفایل</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className="relative mx-auto h-[280px] w-[280px] touch-none overflow-hidden rounded-full border border-border bg-muted"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                onLoad={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
              />
            )}
          </div>

          <label className="flex items-center gap-3 text-sm">
            <span className="shrink-0 text-muted-foreground">بزرگ‌نمایی</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </label>

          {error && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            انصراف
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            تأیید و ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
