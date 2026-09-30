# Course Studio app

The website at `school.vibecode.casa` prepares a personalized course brief. The local app adds Sign in with ChatGPT, a real course preview, resumable lesson writing, and downloadable teaching packs. Original repository code and content remain MIT licensed.

## Run locally

Install Node.js 22.12 or newer, download the starter kit or clone this repository, and run in its folder:

```sh
npm ci
npm start
```

Open `http://127.0.0.1:1455`. Start the brief, continue with ChatGPT, authorize ChatGPT plan usage, choose an account-available model, and make a preview. “Make the teaching materials” starts the requested sessions and parent guide. Each writing request uses the parent's ChatGPT allowance or available credits. Eligible Plus/Pro access and actual model availability are controlled by OpenAI.

No OpenAI API key, shared project key, or client secret is needed for the supported local flow. Sign-in cannot be smoke-tested without an adult completing consent; do not claim live generation works based on mocked tests alone.

Node's local runtime listens only on `127.0.0.1`; do not expose it with a tunnel or deploy it remotely. Change `COURSE_STUDIO_PORT` if the port is occupied. Keep the callback scheme, host, and `/auth/callback` path unchanged; only its port may vary. Use one runtime per data directory so rotating credentials cannot race.

## Family privacy and saved work

The browser keeps a brief in session storage for that tab. Clear it with “Clear the brief,” or save it to a private JSON file. Hosted brief creation does not send those fields to the server. Continuing in ChatGPT sends what the parent pastes into that service.

The local app sends course context to OpenAI only for requested previews/teaching materials. Requests use the public Responses API with `store:false` and `stream:true`. Credentials never go to browser JavaScript, localStorage, analytics, the public website, or course downloads. Protected local files hold account registrations, validated identities, tokens, and host ID. Account switching keeps registrations separate; signing out clears credentials and attempts remote session revocation. Unconfirmed revocation is surfaced with a recovery link.

Data defaults to `~/.local/share/course-studio/`. Set `COURSE_STUDIO_DATA_DIR` to a private directory if needed; within this checkout use ignored `courses/` or `.course-studio/`. Do not put credentials, briefs, generated family packs, or render images in public folders. Removing the local data folder erases registrations and saved courses; disconnect the app in ChatGPT settings to revoke access remotely.

Completed sessions are saved as they finish. The app can pause, resume, and recover a partially written pack after restart. It never automatically retries inference. Keep the local app running during writing; reopening the UI retrieves the latest course for the selected account. Download exports before clearing local course files.

## What the first edition creates

English or Spanish text-based courses, one to six weeks, one to three sessions per week, 20–90 minutes per session. Each includes real instruction, worked examples, activity steps, response space, reflection, support/stretch/shorter routes, adult preparation and teaching notes, and paired answers. Exports: three PDFs, editable course JSON, manifest, quality note, and ZIP.

The model has no research, image-generation, or interactive-file tools in this runtime. All exports remain drafts requiring adult review of factual accuracy, educational fit, and rendered pages. Generated images, exact-scale patterns, digital activities, independent source verification, and learner pilots are outside this edition. The original ChatGPT Work workflow still supports broader formats when its session has the required tools.

## Hosting on Cloudflare

```sh
python3 scripts/package.py
python3 scripts/package.py --check
npm run build:site
npm run deploy
```

`wrangler.jsonc` serves only staged public assets and the four intended downloads, with a Worker custom domain at `school.vibecode.casa`. It does not publish `app/`, credentials, or private family output as executable endpoints. The public starter ZIP includes the app's source so parents can run it locally. The build must run after packaging so downloads are current.

Use Cloudflare's [static assets](https://developers.cloudflare.com/workers/static-assets/) and [custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) guidance. Deploy requires an authenticated account and permission to attach the domain. Existing GitHub Pages publishing remains available for the public static site; it does not provide hosted inference.

## Hosted generation access

The [OpenAI integration guide](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt) limits the public flow to local apps. Before offering remote sign-in/generation, obtain OpenAI access and a client registered for the exact HTTPS callback. Identity sign-in and permission to use a ChatGPT plan are distinct; identity-only approval is insufficient. Do not reuse `dynamic_agent_client` with a Cloudflare callback or proxy the local flow through our domain.

Once approved, implement server-held OAuth transactions with PKCE/nonce, validated identity, secure first-party sessions, protected per-user credentials, explicit plan consent, atomic refresh, and course ownership. The current app intentionally includes no speculative hosted compatibility layer.

## Validation

`npm test` checks OAuth/state contracts, streamed completion/errors, schedule validation, authorization boundaries, ownership, pause/resume, and export separation without spending plan usage. `python3 scripts/package.py --check` validates public packaging. Visual QA uses fictional data in ignored `tmp/` and checks mobile/wide layouts and rendered PDFs. Live sign-in, model discovery, and completed inference must be recorded separately after real consent.
