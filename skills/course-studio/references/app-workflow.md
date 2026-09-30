# Course Studio UI and ChatGPT plan usage

Use this reference when a family brief comes from the Course Studio workspace or when maintaining its runtime.

## Two supported surfaces

- The public website prepares a brief in a browser tab, gives the parent a personalized message to take into ChatGPT Work, and can save/import that brief. No model request or credential collection occurs there.
- The local Node app serves the same UI on `127.0.0.1`. A parent signs in through OpenAI, explicitly authorizes ChatGPT plan usage, selects an available model, creates a preview, and requests the teaching pack. Course files and protected OAuth credentials stay on their computer. Each inference request sends the required family brief/course context to OpenAI.

As verified on September 30, 2026, the public open-source integration runs locally with a loopback callback. A remotely hosted integration requires OpenAI access and a provisioned client. A free or open-source website alone does not establish hosted authorization. See the [official integration guide](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt) and [website sign-in guide](https://developers.openai.com/siwc/website). Recheck these contracts before changing the deployment model.

Do not turn setup in an existing ChatGPT Work session into app installation. Its current session already provides its own authentication and tools; retain the normal environment-aware setup protocol.

## Runtime contract

The app builds its model instructions directly from the canonical skill and relevant course-design/production references. Do not maintain another curriculum prompt in application code. The standalone ChatGPT prompt must preserve the same essential decisions.

The UI is quick-start mode: reuse interest, age, comfortable skills/supports, weeks, session count/minutes, supplies/preparation limits, language, and paper size. The model chooses the concept, progression, concrete teaching, activities, and answers. Typed validation enforces bounds and schedule/timing/answer correspondence. Do not infer conversational intent from keyword or phrase lists.

The first local edition makes self-contained text-and-household-material teaching packs in English or Spanish. It has no research browser, illustration generator, or digital-activity tool. Do not promise verified external facts, generated art, exact-scale templates, interactive files, or selected formats beyond this runtime. In a fully capable chat session, use the broader skill's available production tools.

Preview and build are distinct actions with visible usage information. Model discovery uses the selected account's authoritative catalog. A valid identity token alone does not authorize inference: require the granted `chatgpt.tokens.use.direct` scope. Keep account/client mappings separate, credentials server-side, and active builds tied to the selected account. Links to ChatGPT usage settings are the recovery path for usage limits.

## Files and honest completion

Each finished export contains START-HERE, a learner pack, a separate parent/teacher guide, editable course JSON, a manifest, and a ZIP. Adult keys must not appear in learner files. Stable session/question IDs connect the guide to final learner page starts.

The app checks coverage, required structured fields, timing totals, and answer correspondence. It cannot independently certify factual accuracy, educational fit, every rendered PDF page, or real-child outcomes. Label exported material `draft-needs-adult-review` until the missing checks are actually performed; do not equate successful export with the skill's full release checks.

Save each completed lesson before proceeding. On pause, usage failure, invalid output, or restart, retain completed work and exact remaining work. Resume only on the parent's action; no automatic inference retries or fabricated background completion. Retrying a failed request can consume additional plan usage.
