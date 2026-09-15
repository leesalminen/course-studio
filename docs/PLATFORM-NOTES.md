# Platform notes

Checked September 15, 2026. Account capabilities can change; check the actual session before making installation or artifact promises.

## ChatGPT Work

OpenAI describes Work as a surface for multi-step tasks and finished files, including PDFs. This supports using it for the interview, course creation, and artifact workflow. It does not prove that every account/session has every tool. [Work on the web](https://learn.chatgpt.com/docs/web), [Working with files](https://learn.chatgpt.com/docs/artifacts-viewer).

## Skills and persistence

The official skill guide describes reusable skill instructions, creation through `@skill-creator` in ChatGPT Work, local skill installation/discovery, and plugin-based distribution across surfaces. It distinguishes standalone skills from skills distributed in plugins. Course Studio therefore checks native installation capabilities and otherwise uses its full instructions in the current session. Pasting a URL is not documented as a universal persistent-install API. [Build skills](https://learn.chatgpt.com/docs/build-skills).

For installed skills, supported ChatGPT surfaces use `@` mentions and Codex uses `$` mentions. A mention does not install a missing skill. [Skills and plugins](https://learn.chatgpt.com/docs/skills-and-plugins).

## What this release provides

A public source repository, a self-contained setup document, a portable prompt/handbook, an installable skill folder for supported hosts, a downloadable starter kit, and checked sample PDFs. It does not operate a server or publish a marketplace plugin. Native persistence and cross-conversation file access are verified at setup time rather than assumed.

The README's one-message path is the intended workflow. Repository retrieval and packaging can be tested independently; a fresh ChatGPT Work account test is still required to confirm the entire experience on a particular account. Product documentation is evidence of supported features, not evidence that this repository was run in that account.
