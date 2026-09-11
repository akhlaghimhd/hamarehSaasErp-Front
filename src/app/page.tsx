import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>هماره ERP</CardTitle>
          <CardDescription>
            اسکلت Frontend با الگوی Admin مبتنی بر shadcn/ui آماده است.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/dashboard">ورود به داشبورد</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            فونت وزیرمتن · راست‌چین · تم آبی سازمانی
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
