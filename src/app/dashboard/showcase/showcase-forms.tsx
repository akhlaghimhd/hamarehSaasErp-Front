"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Separator } from "@/shared/components/ui/separator";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export function ShowcaseForms() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>فرم و کنترل‌ها</CardTitle>
            <CardDescription>چک‌باکس مربعی · سوییچ · سلکت</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">نام کالا</Label><Input className="h-9" placeholder="لپ‌تاپ ایسوس ۱۵" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">گروه کالا</Label>
                <Select>
                  <SelectTrigger className="h-9"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">تجهیزات IT</SelectItem>
                    <SelectItem value="raw">مواد اولیه</SelectItem>
                    <SelectItem value="spare">قطعات یدکی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">توضیحات</Label><Textarea placeholder="توضیح تکمیلی..." /></div>
            <Separator />
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked />قابل فروش</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox />کنترل سریال</label>
              <label className="flex items-center gap-2 text-sm"><Switch defaultChecked />فعال در سیستم</label>
            </div>
          </CardContent>
          <CardFooter>
            <Button size="sm">ذخیره</Button>
            <Button size="sm" variant="secondary">پیش‌نویس</Button>
            <Button size="sm" variant="outline">انصراف</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>تب‌ها، جداکننده، لودینگ</CardTitle>
            <CardDescription>چینش راست‌چین</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info" dir="rtl">
              <TabsList>
                <TabsTrigger value="info">اطلاعات</TabsTrigger>
                <TabsTrigger value="stock">موجودی</TabsTrigger>
                <TabsTrigger value="history">تاریخچه</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-2.5">
                <p className="text-xs text-muted-foreground">محتوای تب اطلاعات کالا</p>
                <Separator />
                <div className="grid gap-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">کد</span><span>ITM-00125</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">واحد</span><span>عدد</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">وضعیت</span><Badge variant="success">فعال</Badge></div>
                </div>
              </TabsContent>
              <TabsContent value="stock"><p className="text-sm">موجودی قابل فروش: <strong>۱٬۲۴۰</strong></p></TabsContent>
              <TabsContent value="history" className="space-y-2">
                <p className="text-xs text-muted-foreground">نمونه اسکلتون لودینگ</p>
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>حالت‌های بازخورد</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <Alert variant="success" className="py-2.5"><AlertTitle className="text-sm">موفق</AlertTitle><AlertDescription className="text-xs">عملیات با موفقیت انجام شد.</AlertDescription></Alert>
          <Alert variant="warning" className="py-2.5"><AlertTitle className="text-sm">هشدار</AlertTitle><AlertDescription className="text-xs">موجودی به حد نقطه سفارش رسیده است.</AlertDescription></Alert>
          <Alert variant="destructive" className="py-2.5"><AlertTitle className="text-sm">خطا</AlertTitle><AlertDescription className="text-xs">ثبت سند به دلیل قفل دوره مالی ممکن نیست.</AlertDescription></Alert>
        </CardContent>
      </Card>
    </div>
  );
}
