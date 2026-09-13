/**
 * FE-P0 — Client error boundary for shell content areas.
 */

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type Props = { children: ReactNode; fallbackTitle?: string };
type State = { hasError: boolean; message: string };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "خطای غیرمنتظره در رابط کاربری",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep console for local diagnosis; product logging can plug in later.
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {this.props.fallbackTitle ?? "نمایش این بخش با مشکل مواجه شد"}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">{this.state.message}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            تلاش مجدد
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
