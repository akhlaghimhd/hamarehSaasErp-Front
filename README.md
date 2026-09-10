# Hamareh SaaS ERP – Frontend

Official Frontend repository for Hamareh ERP Platform.

## Official Repositories

| Type              | URL                                                      |
|-------------------|----------------------------------------------------------|
| Backend           | https://github.com/akhlaghimhd/hamarehSaasErp.git        |
| Frontend          | https://github.com/akhlaghimhd/hamarehSaasErp-Front.git  |
| Architecture Docs | https://github.com/akhlaghimhd/hamareh-erp-docs.git      |

## Tech Stack (Locked)

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + Shadcn/UI
- TanStack Query
- Zustand
- React Hook Form + Zod
- Axios

## Getting Started

```bash
# Clone
git clone https://github.com/akhlaghimhd/hamarehSaasErp-Front.git
cd hamarehSaasErp-Front

# Install dependencies
pnpm install
# or: npm install

# Environment
cp .env.example .env.local

# Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                  # Next.js App Router (pages + layout + providers)
├── api/                  # API client & services
├── auth/                 # Auth related logic
├── modules/              # Feature modules (inventory, sales, ...)
├── shared/               # Shared UI, hooks, utils, components
│   ├── components/
│   │   └── ui/           # Shadcn components
│   ├── hooks/
│   └── lib/
└── store/                # Zustand stores (auth, tenant, ...)
```

## Architecture Rules (Non-Negotiable)

See: `Frontend_Phase_Kickoff_Decision_Record_v1.0.md` in the docs repository.

- Frontend talks to Backend **only** via versioned API (`/api/v1/...`)
- No business logic in Frontend
- Tenant Context must be preserved
- RTL + Mobile-First required

## Phase 0 Status

- [x] Project scaffold & config files
- [x] Base folder structure
- [x] API Client (axios)
- [x] Auth Store (Zustand)
- [x] Tenant Store (Zustand)
- [x] TanStack Query Provider
- [ ] Design System in Figma
- [ ] Auth Flow (Login page + integration)
- [ ] Core Shell (Layout + Sidebar + Header)
- [ ] Shadcn UI components installation
