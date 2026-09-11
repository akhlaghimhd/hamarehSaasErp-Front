import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">داشبورد</h1>
        <p className="text-sm text-muted-foreground">
          پیش‌نمایش کامپوننت‌های پایه Design System (فاز A)
        </p>
      </div>

      <Alert variant="success">
        <AlertTitle>پایه قالب آماده شد</AlertTitle>
        <AlertDescription>
          ظاهر دکمه‌ها، فرم‌ها و کارت‌ها از الگوی shadcn/ui Admin گرفته شده است. از این به بعد همه صفحات روی همین پایه ساخته می‌شوند.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>دکمه‌ها</CardTitle>
            <CardDescription>انواع و اندازه‌های استاندارد</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button>اصلی</Button>
            <Button variant="secondary">ثانویه</Button>
            <Button variant="outline">خط‌دار</Button>
            <Button variant="ghost">متنی</Button>
            <Button variant="destructive">خطرناک</Button>
            <Button size="sm">کوچک</Button>
            <Button size="lg">بزرگ</Button>
            <Button disabled>غیرفعال</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نشان وضعیت</CardTitle>
            <CardDescription>برای اسناد و وضعیت‌های ERP</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>پیش‌فرض</Badge>
            <Badge variant="secondary">پیش‌نویس</Badge>
            <Badge variant="warning">در انتظار تأیید</Badge>
            <Badge variant="success">تأیید شده</Badge>
            <Badge variant="destructive">رد شده</Badge>
            <Badge variant="outline">بایگانی</Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>نمونه فرم</CardTitle>
            <CardDescription>فیلد ورودی با برچسب فارسی و راست‌چین</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-name">نام کالا</Label>
              <Input id="item-name" placeholder="مثال: لپ‌تاپ ایسوس ۱۵" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-code">کد کالا</Label>
              <Input id="item-code" placeholder="ITM-00125" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-price">قیمت واحد</Label>
              <Input id="unit-price" type="number" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">انبار</Label>
              <Input id="warehouse" placeholder="انبار مرکزی" disabled />
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button>ذخیره</Button>
            <Button variant="outline">انصراف</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
