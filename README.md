# AeroDine

Automated Dine-in Workflow and Analytics Platform

## Project Structure

```
AeroDine/
├── backend/                    # NestJS Backend Application
│   ├── src/
│   │   ├── auth/              # Authentication Module | Owner: Dev 3 (Core) | Rules: Toàn quyền chỉnh sửa. Dev 1 và Dev 2 chỉ đọc.
│   │   │   ├── dto/
│   │   │   │   ├── create-auth.dto.ts
│   │   │   │   └── update-auth.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── auth.entity.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   └── auth.service.ts
│   │   ├── menus/             # Menu Management Module | Owner: Dev 1 (Guest Experience) | Rules: Toàn quyền chỉnh sửa. Dev 2 và Dev 3 có thể đọc, nhưng thay đổi cần thông báo.
│   │   │   ├── dto/
│   │   │   │   ├── create-menu.dto.ts
│   │   │   │   └── update-menu.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── menu.entity.ts
│   │   │   ├── menus.controller.ts
│   │   │   ├── menus.module.ts
│   │   │   └── menus.service.ts
│   │   ├── orders/            # Order Management Module | Owner: Dev 2 (Operations) | Rules: Toàn quyền chỉnh sửa. Dev 1 và Dev 3 có thể đọc, nhưng mọi thay đổi phải thông qua Dev 2.
│   │   │   ├── dto/
│   │   │   │   ├── create-order.dto.ts
│   │   │   │   └── update-order.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── order.entity.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.module.ts
│   │   │   └── orders.service.ts
│   │   ├── users/             # User Management Module | Owner: Dev 3 (Core) | Rules: Toàn quyền chỉnh sửa. Dev 1 và Dev 2 chỉ đọc.
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   └── update-user.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.module.ts
│   │   │   └── users.service.ts
│   │   ├── socket/            # WebSocket Gateway | Owner: Dev 2 (Operations) | Rules: Toàn quyền chỉnh sửa. Dev 1 và Dev 3 cần thảo luận trước khi sửa.
│   │   │   └── socket.gateway.ts
│   │   ├── common/            # Common Utilities | Owner: Dev 3 (Core) | Rules: ⚠️ CORE - Cần thảo luận với team trước khi sửa. Mọi thay đổi ảnh hưởng đến toàn bộ modules.
│   │   │   ├── decorators/    # Custom decorators
│   │   │   └── guards/        # Authentication/Authorization guards
│   │   ├── config/            # Configuration | Owner: Dev 3 (Core) | Rules: Toàn quyền chỉnh sửa. Dev 1 và Dev 2 chỉ đọc.
│   │   │   └── configuration.ts
│   │   ├── database/          # Database Module | Owner: Dev 3 (Core) | Rules: Toàn quyền chỉnh sửa. Dev 1 và Dev 2 chỉ đọc.
│   │   │   └── database.module.ts
│   │   ├── app.controller.ts
│   │   ├── app.controller.spec.ts
│   │   ├── app.module.ts      # ⚠️ CORE | Owner: Dev 3 (Core) | Rules: Cần thảo luận với team trước khi sửa. Root module, quản lý imports của tất cả modules.
│   │   ├── app.service.ts
│   │   └── main.ts            # ⚠️ CORE | Owner: Dev 3 (Core) | Rules: Cần thảo luận với team trước khi sửa. Entry point của ứng dụng, CORS config.
│   ├── test/                  # E2E Tests
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   ├── eslint.config.mjs
│   ├── nest-cli.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── README.md
│
├── frontend/                   # React + TypeScript Frontend Application
│   ├── src/
│   │   ├── components/        # Reusable Components
│   │   │   ├── admin/         # Admin-specific components | Owner: Dev 3 (Core) | Rules: Toàn quyền chỉnh sửa.
│   │   │   ├── common/        # Common/shared components | Owner: Tất cả | Rules: Có thể chỉnh sửa, nhưng cần thảo luận với team nếu thay đổi lớn.
│   │   │   ├── customer/      # Customer-specific components | Owner: Dev 1 (Guest Experience) | Rules: Toàn quyền chỉnh sửa.
│   │   │   └── staff/         # Staff-specific components | Owner: Dev 2 (Operations) | Rules: Toàn quyền chỉnh sửa.
│   │   ├── pages/             # Page Components
│   │   │   ├── admin/         # Admin pages | Owner: Dev 3 (Core) | Rules: Toàn quyền chỉnh sửa.
│   │   │   ├── auth/          # Authentication pages | Owner: Dev 3 (Core) | Rules: Toàn quyền chỉnh sửa.
│   │   │   ├── customer/      # Customer pages | Owner: Dev 1 (Guest Experience) | Rules: Toàn quyền chỉnh sửa. Dev 1 quản lý tất cả customer-facing pages (Menu, Cart, Order Tracking).
│   │   │   └── staff/         # Staff pages | Owner: Dev 2 (Operations) | Rules: Toàn quyền chỉnh sửa. Dev 2 quản lý waiter dashboard, KDS pages.
│   │   ├── routes/            # Routing Configuration
│   │   │   └── AppRoutes.tsx  # ⚠️ HOTSPOT | Owner: Dev 1 (Guest Experience) | Rules: Dev 1 quản lý routing chính. Dev 2 và Dev 3 cần thảo luận trước khi thêm/sửa routes.
│   │   ├── services/          # API Services
│   │   │   └── socket.ts      # WebSocket service | Owner: Dev 2 (Operations) | Rules: Toàn quyền chỉnh sửa.
│   │   ├── hooks/             # Custom React Hooks
│   │   │   └── useSocket.ts   # WebSocket hook | Owner: Dev 2 (Operations) | Rules: Toàn quyền chỉnh sửa. Dev 1 có thể sử dụng nhưng không được sửa.
│   │   ├── store/             # State Management
│   │   │   ├── cartStore.ts   # Shopping cart store | Owner: Dev 1 (Guest Experience) | Rules: Toàn quyền chỉnh sửa. Dev 2 có thể đọc để hiểu order flow.
│   │   │   └── userStore.ts   # User state store | Owner: Dev 3 (Core) | Rules: Toàn quyền chỉnh sửa. Dev 1 và Dev 2 có thể đọc.
│   │   ├── types/             # TypeScript Type Definitions
│   │   ├── utils/             # Utility Functions
│   │   ├── App.tsx            # Main App Component
│   │   ├── main.tsx           # Application Entry Point
│   │   └── index.css          # Global Styles
│   ├── public/
│   │   └── vite.svg
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── README.md
│
├── packages/                   # Shared Packages
│   └── shared-types/          # Shared TypeScript Types | Owner: Dev 3 (Core) | Rules: ⚠️ HOTSPOT - Chỉ đọc, không được sửa trực tiếp. Mọi thay đổi phải thảo luận với team và được Dev 3 review. Phải build lại sau khi sửa: `pnpm --filter shared-types build`
│       ├── src/
│       │   ├── index.ts
│       │   ├── menu.types.ts
│       │   └── order.types.ts
│       ├── package.json
│       └── tsconfig.json
│
├── pnpm-workspace.yaml         # PNPM Workspace Configuration | Owner: Dev 3 (Core) | Rules: ⚠️ CORE - Chỉ Dev 3 được sửa. Cấu hình monorepo workspace.
├── pnpm-lock.yaml              # PNPM Lock File
├── package.json                # Root Package Configuration | Owner: Dev 3 (Core) | Rules: ⚠️ CORE - Cần thảo luận với team trước khi sửa. Quản lý workspace scripts, dependencies chung.
├── TESTING.md                  # Testing Documentation
└── README.md                   # Project Documentation
```

## Module Overview

### Backend Modules

-   **auth**: Authentication and authorization
-   **users**: User management (admin, staff, customer)
-   **menus**: Menu item management
-   **orders**: Order processing and management
-   **socket**: Real-time communication via WebSocket
-   **common**: Shared utilities including decorators and guards
-   **config**: Application configuration
-   **database**: Database module configuration

### Frontend Structure

-   **components**: Reusable UI components organized by user role (admin, common, customer, staff)
-   **pages**: Route-level page components organized by user role
-   **routes**: Application routing configuration
-   **services**: API and WebSocket service integrations
-   **hooks**: Custom React hooks (e.g., useSocket for WebSocket connections)
-   **store**: State management stores (cart, user)
-   **types**: TypeScript type definitions (currently empty, types shared via packages/shared-types)
-   **utils**: Utility functions and helpers
-   **App.tsx**: Main application component
-   **main.tsx**: Application entry point
-   **index.css**: Global styles

### Shared Packages

-   **packages/shared-types**: Shared TypeScript type definitions used across backend and frontend (menu.types.ts, order.types.ts)
