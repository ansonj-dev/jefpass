# Appwrite retirement note

JëfPass no longer uses Appwrite for hosting or persistence. The Appwrite Site deployment was removed by the project owner. The active deployment target is Cloudflare Workers with Cloudflare D1.

Do not recreate the old Appwrite Site, TablesDB database, records table or secrets table as part of the current deployment.

For the current runtime, database schema, binding and deployment instructions, see [CLOUDFLARE.md](CLOUDFLARE.md).

Local development remains on Node.js 24 and the existing node:sqlite file database. Cloudflare production uses the DB D1 binding and does not create a local SQLite file.
