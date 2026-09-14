# Hamareh SaaS ERP — Frontend

مخزن رسمی Frontend پلتفرم هماره ERP.

## تصمیم‌های قفل‌شده

- مخزن جدا از Backend
- فقط Web در فاز اول
- Next.js + TypeScript + Tailwind + **shadcn/ui**
- TanStack Query + Zustand + React Hook Form + Zod
- زبان UI: **فارسی** | جهت: **RTL** | فونت: **Vazirmatn**
- اولویت ماژول: Foundation → Inventory → Procurement/Sales → Accounting

## پایه ظاهری (قالب)

ظاهر پروژه بر اساس الگوی **shadcn/ui Admin** بنا شده است  
(هم‌تراز با قالب‌های رایجی مثل `shadcn-admin` از نظر دکمه، فرم، کارت، سایدبار و تم).

ساختار ماژولار خود پروژه (`api` / `auth` / `modules` / `store`) حفظ شده و لایه UI Admin روی آن سوار شده است.

## اجرای لوکال

```bash
git pull origin main
pnpm install
# یا: npm install

cp .env.example .env.local
pnpm dev
```

آدرس‌ها:
- صفحه شروع: http://localhost:3000
- داشبورد و پیش‌نمایش کامپوننت‌ها: http://localhost:3000/dashboard

## ساختار

```
src/
  app/                 # App Router (صفحات)
  api/                 # API Client مرکزی
  auth/                # جریان احراز هویت
  modules/             # ماژول‌های کسب‌وکار
  shared/
    components/ui/     # کامپوننت‌های shadcn
    components/layout/ # سایدبار و هدر
    lib/               # ابزارها
  store/               # Zustand stores
```

## فاز فعلی

Phase 0: اسکلت + قالب Admin + RTL + فونت + کامپوننت‌های پایه (دکمه، ورودی، کارت، نشان، هشدار)

## FE-P0 — Foundation status

Critical path implemented:

- API client: Bearer + `X-Tenant-ID`, timeout, limited retry, `ApiClientError`
- Auth store (Zustand) + session snapshot in `localStorage`
- Auth service: password / OTP / select-tenant / logout / `profiles/me`
- Login page (RTL), AuthGuard / GuestGuard, TenantProvider
- App shell: Header (user + organization name) + collapsible Sidebar
- Shared form / table / dirty dialog / feedback primitives + UI Guide

### Known deferred debts

- Refresh-token queue: Backend has no refresh endpoint yet (401 clears session)
- httpOnly cookie storage for tokens (currently `localStorage`)
- Full tenant module catalog from a dedicated API (not required for shell)

See `docs/FE-P0-CLOSEOUT.md` for the phase checklist.
