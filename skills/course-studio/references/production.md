# Publish materials families can use

## Deliverable contract

Every complete course has actual printable PDFs of all instructional materials and a parent/teacher guidebook. Common organization:

- `START-HERE.pdf`: Inventory, print plan, first-session setup, edition/version.
- `Student-Workbook.pdf`: When selected; sessions with teaching, exercises, response space.
- `Reading-Book.pdf`: When extended readings are selected; may be combined with the workbook for easier use.
- `Activity-Materials.pdf`: Cards, patterns, data, reference sheets, offline interactions; combine into learner pack when compact.
- `Parent-Teacher-Guide.pdf`: Planning, session notes, answers, assessment, sources.
- Editable sources, individual art assets, selected interactive files, manifest, and ZIP where supported.

File grouping is flexible. Avoid duplicate printing, decorative filler, arbitrary page counts. List where each selected format appears. A combined learner pack is valid; adult answers remain separate.

## Production workflow

1. Plan inventory/IDs before layout. Draft complete content and adult keys together; reconcile before export.
2. Use available document/PDF tooling. In Codex, use installed PDF/document skills when available. Else use available file-generation tools; do not depend on an absent skill.
3. Use requested paper size. If unknown, state the edition and use generous margins. Generate Letter and A4 when useful, not automatically doubling a large pack. Exact-scale templates require a size-specific edition, calibration mark, and actual-size/100% print instructions.
4. Export selectable text, embedded fonts where possible, page numbers, clear headings, and stable IDs. Check extraction order; do not claim formal PDF accessibility compliance without testing.
5. Render every page to images and visually inspect. Inspect dense pages, tables, exact-scale templates, and diagrams at readable resolution. Fix clipping, overflow, missing glyphs, contrast, and response space, then recheck changed pages.
6. Reopen PDFs; verify page counts, text, links, and inventory. Package current files only; omit build intermediates.

If PDF tools are unavailable, say export is incomplete. Deliver useful sources and a precise resume/export route, but never label chat text or HTML as delivered PDFs. Verify file links; do not invent them. Continue beyond a sample when a full build is authorized and feasible.

## Visual direction and print usability

Choose a course-specific editorial style: strong title treatment, restrained palette, readable body type, consistent treatments for readings/examples/tasks/parent notes. Body text around 12–14 pt is a practical starting point; adjust for needs. Use generous spacing and handwriting/drawing areas. Avoid pale response lines and large dark ink areas.

Design for black-and-white use: color never carries an instruction alone. Label diagrams directly; add shapes/patterns where useful. Mark cutting pages and keep unrelated content off their backs; identify single-sided pages. Larger books need a contents page and selective print guide.

Give each asset a job: explanation, inspiration, observation, comparison, or template. Generate original raster art when it helps; inspect accuracy, omissions, artifacts, and age fit. Add instructional labels in layout rather than image output. Do not generate art merely to decorate every page. Precise plots, guides, grids, and patterns need deterministic drawing and verified dimensional relationships in the PDF.

Record filename, purpose, provenance (generated/original drawing/licensed), source URL/license if applicable, and useful descriptive text. Do not invent licensing guarantees for generated work. Exclude private child photos/identifiers from reusable examples.

## Interactive work

Choose a medium suited to the goal: sorting cards, tabletop simulation, role-play, branching paper mystery, spreadsheet, or offline browser activity. Clarify physical versus screen interaction in the interview.

If digital is selected, build the working interaction, not a screenshot/idea. Verify instructions, keyboard use, feedback, reset/replay, and representative correct/incorrect/edge cases. Include opening instructions. Prefer self-contained local files without tracking, login, or network dependence.

The printable companion must contain the same task, necessary data/states/options, and a checking/discussion route in the adult guide. A link or “ask ChatGPT” is not an offline equivalent. Let learners attempt answers before revealing feedback. Core student work must be possible without an AI chat.

## Release checks

Record checks actually performed and limitations in `quality-check.md`. Check observable results:

- **Scope:** Every requested week/session; selected formats contain real material; selected subjects map to tasks and evidence.
- **Workload:** Core timings sum correctly, optional work is separate, supplies/quantities/prep fit the brief.
- **Learning:** Supported prerequisites, progression, useful models, creative choice, achievable capstone.
- **Accuracy:** Independently solved closed tasks and arithmetic, consistent units/data, verified factual claims, answerable reading questions.
- **Correspondence:** Every question has the correct key or criteria; IDs/final pages agree; student files contain no adult answer keys.
- **Production:** PDFs open, page inventory matches, all pages rendered/inspected, readable text, intentional blanks, adequate response space, assets/links resolve.
- **Interaction:** Selected digital work functions beyond its first screen and has an equivalent offline activity.
- **Handoff:** Print settings, inventory, editable sources, asset notes, and current files included; examples omit private learner details.

Fix substantive failures before calling the course complete. Identify exact unverified checks when tools prevent them and mark the build partial. Do not claim a parent pilot or learner outcome was tested when only artifacts were checked.
