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
          هویت بصری هماره — سبز جنگلی، کرم روشن، سایه و گرادیان ملایم
        </p>
      </div>

      <Alert className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent shadow-[var(--shadow-xs)]">
        <AlertTitle>پایه قالب آماده شد</AlertTitle>
        <AlertDescription>
          دکمه‌ها با گرادیان، کارت‌ها با عمق سطحی، و پس‌زمینه با تناژ کرم-سبز ملایم تنظیم شده‌اند.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>اسناد امروز</CardDescription>
            <CardTitle className="text-3xl">۱۲۸</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="success">+۱۲٪ نسبت به دیروز</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>در انتظار تأیید</CardDescription>
            <CardTitle className="text-3xl">۲۴</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="warning">نیاز به اقدام</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>کالاهای فعال</CardDescription>
            <CardTitle className="text-3xl">۳٬۴۲۰</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>موجودی به‌روز</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>دکمه‌ها</CardTitle>
            <CardDescription>گرادیان روی دکمه اصلی + سایه رنگی</CardDescription>
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
            <CardDescription>فیلد با سایه خیلی ملایم و فوکوس رنگی</CardDescription>
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
