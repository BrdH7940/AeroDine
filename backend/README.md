# AeroDine Backend

NestJS backend application for AeroDine restaurant management system.

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended - see [NEON_SETUP.md](../instructions/NEON_SETUP.md))

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Update DATABASE_URL in .env with your Neon connection string
# See instructions/NEON_SETUP.md for detailed guide
```

### Database Setup

1. **Configure Neon Database**:
   - Follow instructions in [NEON_SETUP.md](../instructions/NEON_SETUP.md)
   - Copy connection string from Neon Console
   - Update `DATABASE_URL` in `.env` file

2. **Run Migrations**:
   ```bash
   npx prisma migrate deploy
   # OR for development with seed
   npx prisma migrate dev
   ```

3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

### Development

```bash
# Start development server
pnpm run start:dev

# Build for production
pnpm run build

# Start production server
pnpm run start:prod
```

## Environment Variables

See [.env.example](./.env.example) for all required environment variables.

Key variables:
- `DATABASE_URL`: Neon PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CORS_ORIGIN`: Frontend URL for CORS

## Database Connection

This project is configured to work with **Neon PostgreSQL**. 

For connection string format and setup instructions, see [NEON_SETUP.md](../instructions/NEON_SETUP.md).

### Connection Types

- **Connection Pooling** (recommended for production):
  ```
  postgresql://user:pass@host/db?sslmode=require&pgbouncer=true
  ```

- **Direct Connection** (for migrations):
  ```
  postgresql://user:pass@host/db?sslmode=require
  ```

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── src/
│   ├── auth/              # Authentication module
│   ├── users/             # User management
│   ├── menus/             # Menu management (Dev 1)
│   ├── orders/            # Order management (Dev 2)
│   └── socket/            # WebSocket gateway
└── .env                   # Environment variables (not committed)
```

## API Endpoints

Base URL: `http://localhost:3000/api`

### Menus (Dev 1)
- `GET /menus/categories` - Get all categories
- `GET /menus/items` - Get menu items
- `GET /menus/items/:id` - Get menu item by ID
- `POST /menus/items` - Create menu item

See individual module files for full API documentation.

## Development Notes

- **Database Module**: Owned by Dev 3 (Core) - Read only
- **Menus Module**: Owned by Dev 1 - Full access
- **Orders Module**: Owned by Dev 2 - Read only
- **Auth/Users**: Owned by Dev 3 - Read only

See [main README.md](../README.md) for ownership rules.
