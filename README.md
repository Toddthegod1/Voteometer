# Voteometer

A starter full-stack app for comparing candidate preference and electability.

## How to run

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npx prisma generate
```

3. Create the database:

```bash
npx prisma db push
```

4. Start the app:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Notes

This starter version:
- uses seed data in the frontend
- calculates results live in the browser
- also includes API routes for future backend expansion
- is easy to upgrade to Postgres later

## I am going to add these changes later

- save candidates and matchups in Prisma
- add simplified mode
- add expert estimate toggle
- add election-year configs
- add admin editing tools
