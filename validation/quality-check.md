# Course Studio 1.0.0 / release review

Date: September 15, 2026.

## Checked

- Codex skill validator passed: naming, frontmatter, and scaffold completion.
- Skill entry point and all three linked references exist. UI metadata includes an explicit `$course-studio` invocation. Automatic discovery retains its default behavior.
- Standalone ChatGPT prompt is 7,965 characters and includes the essential workflow without depending on installed Codex skills or local paths. The consolidated handbook contains the three reference documents in full.
- Manual instruction review covered guided versus quick-start flow, missing references, learner readiness versus age, selected versus mandatory formats, revision/resume, full readings, adult keys, PDF-tool limitations, and offline alternatives.
- Built the Pocket Lab example using the production requirements. This is a local authored demonstration, not an independent model evaluation of every scenario.
- Sample is one week/two sessions, 45 minutes each. Core timing sums verified. Five requested academic connections have actual activities and evidence in the brief.
- Original reading is 630 words. Reading questions were manually reconciled with the passage; closed measurements and units independently recalculated; open tasks have examples and criteria rather than single prescribed results.
- Learner Q01–Q09 and adult answer/criteria references correspond. Adult keys remain in a separate file.
- Three final PDFs reopen correctly: starter guide 3 pages, learner pack 8 pages, parent/teacher guide 5 pages. US Letter dimensions and selectable text checked.
- Every PDF page was rendered and visually inspected. Dense reading/answer pages and the exact-size template received closer inspection. An adult-guide overflow was fixed. No remaining page overflow or clipped content was found.
- Template outer geometry verified in the exported PDF: 14 × 17 cm. The calibration line represents 2 cm; the parent must still check their printer's physical scale before cutting.
- Source files include full editable sample text, the reading separately, and the original SVG template. Reference build script successfully produced all three PDFs in this workspace.

## Practical limits

- Not yet piloted with a child or parent; timing, engagement, and physical assembly remain to be validated through use.
- The scenario collection is a future behavioral test set, not a report that all scenarios have been executed by fresh models.
- No digital interaction was selected for the sample. The skill specifies digital/offline equivalence, but a digital activity has not been built or browser-tested in this release.
- No image-generation call was needed for the precise paper template; it is an original vector asset. Raster-generation behavior remains to be exercised in a course needing illustration.
- Actual PDF/image generation in a friend's ChatGPT session depends on available tools. The public source distribution does not create a hosted GPT or marketplace plugin.
- The reference PDF builder uses ReportLab, pypdf, and Noto Sans/Noto Serif fonts. It accepts `--font-dir` and `--only`; ordinary parent setup does not run it.

## Public distribution update

- Added a public README with a single-message Work setup, a native-install/current-session distinction, raw-file and attachment fallbacks, FAQ, maintainer guidance, and MIT license.
- The setup protocol uses existing host tools and does not assume that writing a file registers a skill. Parent setup does not require rebuilding examples or configuring a server.
- Added a generated single-file setup containing the complete protocol, standalone workflow, and handbook. Relative links in embedded references resolve to their repository sources.
- Packaging checks validate actual bundled file/link existence, generated text/manifest consistency, and ZIP payloads. Private course output and QA renders are excluded from the bundle.
- A clean extracted kit was rebuilt and matched every original archive entry. Checks rejected a deliberately stale canonical reference and a deliberately broken documentation link; all manifest hashes matched the current public files.
- Updated the three-page starter PDF for repository-based setup; reopened, rendered, and inspected all three pages. Sample learner/teacher PDFs retained their previously checked content.
- A fresh ChatGPT Work account test remains outstanding. Source retrieval and archive checks alone do not establish full autonomous setup or native installation in every account.

See `scenarios.md` for realistic follow-on cases and `pdf-checks.json` for the PDF checks. Recheck the relevant artifacts whenever content or layout changes.
