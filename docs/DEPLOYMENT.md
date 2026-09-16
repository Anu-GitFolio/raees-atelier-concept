# Hosting the review site

Review URL: https://raees-atelier-concept.raees-atelier-concept.workers.dev

The application runs on Cloudflare Workers with a D1 database. Static hosting alone cannot run its cart, saved collection or order history.

Use a Cloudflare account on the Workers Free plan. The free allowance is suitable for a small review demonstration, subject to the provider's current request, CPU and database limits. A `workers.dev` address is included; a purchased domain is unnecessary.

## First deployment

Install the locked dependencies with `npm ci`, then authenticate in your own browser:

```sh
npx wrangler login
```

Create a database and bind it to the production configuration:

```sh
npx wrangler d1 create raees-atelier-review --config wrangler.production.jsonc
```

Copy the returned database ID into the `DB` entry in `wrangler.production.jsonc` as `database_id`. If Wrangler offers to update that binding, select it instead. The database ID is an identifier, not a credential. Use an existing matching database only after verifying it belongs to this project.

Apply the schema before making the site available:

```sh
npm run db:migrate:production
npm run deploy
```

The deployment output supplies the review URL. If the account has no `workers.dev` subdomain, configure a neutral subdomain in Cloudflare's dashboard when prompted. Keep the account on the Free plan; no payment integration or paid service is required by this project.

## Subsequent changes

Append migrations for schema changes and apply them before deploying the matching code. Otherwise `npm run deploy` rebuilds and publishes the site. Browser data remains in D1 across code deployments.

After deployment, verify that the public URL opens without a sign-in requirement, then exercise save, bag, demo checkout, history and reorder in a fresh browser session. Confirm Arabic layout and phone navigation. The site must continue to label orders as demonstrations and retain its independent-project notice.

## Source handoff

`npm run review:package` creates a source folder and compressed archive under `artifacts/`. It includes application code, database migrations, tests, documentation and font licence notices. Dependency installations, local database records, credentials and repository history are omitted.

## Provider references

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Workers subdomains](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
