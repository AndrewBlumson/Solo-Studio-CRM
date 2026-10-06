# Solo Studio

[![Open in Replit](https://img.shields.io/badge/Open_in-Replit-F26207?style=for-the-badge&logo=replit&logoColor=white)](https://replit.com/github.com/AndrewBlumson/Solo-Studio-CRM)

Click **[Open in Replit](https://replit.com/github.com/AndrewBlumson/Solo-Studio-CRM)** to import your own copy into your Replit account.

**This creates your own Replit app.** You can use and customise it in Replit without creating a GitHub repository first. If you later want to save your changes to GitHub, connect a repository in your own account using Replit's Git pane. The imported Git connection may initially point to this source repository. If you have already imported the app, you can change that connection without reimporting or discarding your work.

Solo Studio is a private workspace for independent makers and freelancers to manage leads, clients, proposals, projects, tasks, time, invoices and expenses.

Its installable PWA caches public app assets and an offline information page, not private CRM records.

Starter contacts use example.com email addresses. When remixing, replace the sample records and supply your own business settings, company details and service credentials. Keep credentials in Replit Secrets or environment variables.

## Set up your own copy in Replit

Import this repository into a new Replit project and use Replit's native Database and Clerk Auth tools. Replit apps include a database by default; let Replit manage the project's services and credentials.

If the imported app needs any setup completed, ask Agent to connect the existing code to this project's native services and apply its database schema. Company details start empty for you to complete.

This app uses Replit's built-in Clerk Auth integration. When Agent sets it up for your project, Replit provisions a dedicated Clerk application and manages its credentials. You do not need a separate Clerk account or manual key setup; manage users and sign-in providers in Replit's Auth pane. See Replit's [Clerk Auth](https://docs.replit.com/features/auth-and-identity/clerk-auth) and [Database](https://docs.replit.com/features/data-and-storage/sql-database) documentation.

This repository includes no Clerk keys, database credentials or saved workspace records from the original app. Your copy uses your Replit project's services and does not connect to the author's Clerk instance or database. Development and published production authentication have separate user accounts, so sign up separately in each environment.

## Development

This repository uses pnpm workspaces.

```sh
pnpm install
pnpm run typecheck
pnpm --filter @workspace/solo-studio run test
pnpm run build
```

In Replit, use the managed Solo Studio and API Server workflows. Running the app elsewhere requires configuring the API service, database and Clerk authentication. Keep credentials in environment variables or a secrets manager, never in source files.

## Licence

Solo Studio's original code is available under the MIT Licence. See [LICENSE](LICENSE). Copied shadcn/ui components retain their upstream MIT notice in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). External dependencies and assets remain subject to their own licences; Solo Studio's MIT licence does not relicense them.
