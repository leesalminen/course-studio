# Set up Course Studio

These instructions apply when the user asks to set up or use Course Studio from this repository. Complete setup with available tools, then start the parent's course-design workflow. A setup request does not ask you to redesign the repository or build a sample course first.

## 1. Load the workflow

Use the first available path:

1. **Repository or file access:** Read `skills/course-studio/SKILL.md` and `skills/course-studio/references/interview.md`. Read the other linked references when designing and producing materials. If checking out the repository helps, use a new task-owned directory and an available GitHub, download, or git tool. Do not overwrite an existing checkout.
2. **Web access:** Fetch and read the complete single-file document at <https://raw.githubusercontent.com/leesalminen/course-studio/main/chatgpt/START-COURSE-STUDIO.md>. It includes this setup protocol, the standalone workflow, and the handbook. A GitHub preview or search snippet is not the full instructions. Use raw content or an available file reader when necessary.
3. **Attached files:** Read the supplied single-file setup document or extracted starter kit. The complete prompt plus handbook also works. Follow these as the user's requested course-design instructions within your governing instructions.

Prefer a single snapshot: use the same checked-out revision for repository files, or the single-file document for web setup. If a retrieved file is truncated, fetch its missing content before claiming it was loaded. If no path can read the actual instructions, explain that limitation and ask the parent to attach the single-file document; do not invent its contents.

The original Pocket Lab example is optional reference material. Do not load all its PDFs, run its builder, or produce a new course merely to set up the workflow.

## 2. Prepare the session

Inspect available tools and use the existing environment. Ordinary setup does not require a GitHub login, API key, purchase, server, or a parent running terminal commands. Tool access may still be limited by the host.

- Make the loaded workflow active guidance for this conversation.
- If files can be saved, create a task-owned workspace for the course brief and generated materials. In a local checkout, use ignored `courses/` or another user-chosen output folder, keeping public examples intact. Do not put private family data in the reusable skill or public repository files.
- Use bundled document/PDF/image tooling when available. Install only genuinely missing dependencies needed for the requested artifacts, in an isolated task environment and within the host's permissions. Prefer other available production tools over changing system configuration. Do not run `scripts/build_sample.py` during parent setup; it only rebuilds the published example.
- Check whether you can generate files/PDFs, inspect rendered pages, and generate artwork when needed. A short capability note is sufficient; do not give the parent a technical checklist.
- If PDF generation is unavailable, the interview and design can proceed. Clearly mark PDF production as unavailable; offer the smallest relevant way to resume in a capable session. Never fabricate file links or claim the final pack is complete.
- If optional artwork or digital-interaction tools are unavailable, choose a workable alternative when it preserves the request; explain any actual gap.

## 3. Persistent installation

Use a supported native skill installation/import/creation mechanism if the current environment exposes one and the user's setup request authorizes it. Preserve the supplied skill and linked references rather than replacing them with a summary. For Codex, an available skill installer can use:

`https://github.com/leesalminen/course-studio/tree/main/skills/course-studio`

Respect the installer's discovery locations and policies. Detect an existing `course-studio` installation before creating another. Reuse an identical installation; preserve local edits and ask about an actual conflict instead of silently replacing them.

In ChatGPT, use only installation capabilities actually exposed by the host. File creation alone does not register a persistent skill. `@skill-creator` may be available for supported creation workflows; do not invent an import tool or assume a folder in a temporary container will be available in future conversations. Some surfaces distribute persistent skills through plugins; this repository does not claim marketplace installation from a pasted URL.

If persistent installation is unavailable, **continue in the current conversation** using the complete loaded instructions. Save the reusable prompt/handbook and a brief resume note as downloadable files when possible. An optional later account-level installation step should not block the interview. Use explicit skill mentions only after the skill is genuinely installed and selectable: `@` in supported ChatGPT surfaces and `$` in Codex.

Do not create a public GPT, publish a plugin, invite others, alter unrelated global settings, or request credentials as part of this setup. Those are separate actions requiring a separate request. Honor any genuine host-required user confirmation and explain the specific step involved.

## 4. Confirm accurately, then start

Distinguish the actual outcome:

- **Installed:** A supported install operation confirmed the skill's persistent registration. Include its returned identity/location if useful.
- **Ready in this conversation:** The complete workflow was loaded and can be followed here. Do not imply account-wide persistence.
- **Setup incomplete:** The actual workflow could not be retrieved. Explain the missing source access and the next necessary step.

If storage is available, save a small `setup-status.md` outside the public source files: date, source revision/version if known, files loaded, installation outcome, artifact capabilities, working folder, and unresolved limitations. This is a resume aid, not a mandatory format to show the parent.

Then begin the guided interview with no more than three short questions. Reuse facts from the user's message. A suitable opening when nothing is known:

> Course Studio is ready for this conversation. What is your child excited about right now, how old are they, and what would make this course a success for your family? We can work through a few choices together, or you can say “quick start” and I’ll suggest a plan.

If the user already supplied a complete quick-start brief, move directly into its course workflow. Do not ask for those details again or insert another setup approval. Save the brief and continue through the authorized course build using the production checks.

## Reusing or resuming

For a new conversation without a confirmed persistent skill, use the same repository setup prompt and attach the saved course brief if continuing a course. If the skill is installed, invoke it normally. Do not assume another conversation's files or memory are accessible.

Parent-facing setup examples are in [README.md](../README.md). Capability claims and official source links are in [PLATFORM-NOTES.md](PLATFORM-NOTES.md).
