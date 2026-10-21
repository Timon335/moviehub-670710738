# Deploy MovieHub with Supabase and Vercel

The browser must never receive the PostgreSQL connection string. The Vercel
function in `api/[...path].js` connects to Supabase using the server-only
`DATABASE_URL` variable.

## 1. Create the database tables

1. Open the Supabase project and choose **SQL Editor**.
2. Create a new query and paste the complete contents of
   [`db/schema.sql`](../db/schema.sql).
3. Run the query.
4. Generate the movie seed locally with `node db/seed.mjs`, then paste the
   contents of [`db/seed.sql`](../db/seed.sql) into a second Supabase query.
5. Run the second query.

## 2. Configure Vercel

1. Open the MovieHub project in Vercel and go to **Settings > Environment
   Variables**.
2. Add `DATABASE_URL` for Production, Preview, and Development. Its value is
   the PostgreSQL connection string from Supabase with the password filled in.
3. Do not prefix this variable with `REACT_APP_`, and do not add it to
   `src/`, `.env.example`, or Git.
4. Redeploy the latest deployment.

The frontend calls `/api/...` on the same Vercel domain. No
`REACT_APP_API_URL` value is needed for the deployed site.

## Local development

The existing mock backend remains available with `npm run mock`. To test the
Vercel function locally, use a local `DATABASE_URL` in `.env.local` only and
run it through the Vercel CLI. Never commit that file.
