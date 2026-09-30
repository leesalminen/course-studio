# Course Studio

### Turn a child's curiosity into a course your family can use.

**[Visit Course Studio](https://school.vibecode.casa/)** to make a personalized brief, explore sample materials, or take your brief into ChatGPT.

## Run the course app

The free, open-source local app lets parents **continue with ChatGPT** and use their eligible ChatGPT plan to make a course from our UI. It creates a real preview, complete text-based lessons, printable learner PDFs, and a separate parent guide with answers. Writing can pause and resume. Exports are AI-written drafts for adult review.

With Node.js 22.12 or newer, download the starter kit or clone this repository, then run:

```sh
npm ci
npm start
```

Open `http://127.0.0.1:1455`. No API key is needed. Eligible plan access and models are controlled by OpenAI. Credentials stay on your computer; requested course context goes to OpenAI. [App setup, privacy, capabilities, and hosting](docs/COURSE-APP.md).

The public website builds a brief; direct hosted generation is awaiting OpenAI access. The public Sign in with ChatGPT integration currently supports locally running apps. [Official integration guide](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt).

Design a personalized course with ChatGPT Work: a few weeks of fashion design, space exploration, architecture, wildlife mysteries, game design, or whatever has captured your child's attention.

Course Studio interviews the parent, helps shape the course, and creates the actual teaching materials. Every complete course includes **printable PDFs and a parent/teacher guide with answers**. Designed mainly for ages **9–15**, with learning readiness and family circumstances shaping the details.

## Start with one message

Open a **ChatGPT Work** session and paste:

```text
Set up Course Studio from https://github.com/leesalminen/course-studio. Read the README and follow docs/CHATGPT-WORK-SETUP.md. Handle the setup using the tools available in this session, then start the guided parent interview. Use any details I have already given you.
```

**That is the intended starting experience.** The assistant retrieves the instructions, prepares the workflow, and asks about your child. You do not need to clone the repository, install Python, or copy a long questionnaire.

If the session cannot follow GitHub's file links, give it this **[single-file setup document](https://raw.githubusercontent.com/leesalminen/course-studio/main/chatgpt/START-COURSE-STUDIO.md)**. It contains the setup instructions and full workflow in one file. If it cannot open links at all, download that document and attach it with: “Follow this file to set up Course Studio and begin the parent interview.”

Setup can make the workflow ready in the current conversation. Persistent skill installation depends on the tools and account features available; the assistant must tell you which it actually completed. [ChatGPT Work and skills documentation](docs/PLATFORM-NOTES.md).

## What happens next

1. **A short parent interview.** Usually a few exchanges, with no more than three questions at a time. Share interests, age, readiness, schedule, and what would make the experience worthwhile. Say **“quick start”** to use suggested defaults.
2. **A concrete course preview.** See a recommended concept, weekly progression, time and supplies, plus a sample reading or example, activity, and parent note. Adjust what matters to your family.
3. **The complete teaching pack.** Get the selected readings, workbook pages, projects and activities, plus printable materials and adult guidance. The assistant checks the content, calculations, answers, and PDF pages.
4. **A course that can improve.** After trying a session, say what was fun, difficult, or too long. The assistant updates the affected materials and guide together.

## Make it yours

| You can shape | Examples |
| --- | --- |
| Topic and ending project | Design a costume, investigate a habitat, build a model city, publish a tiny magazine |
| Duration and workload | Three afternoons, four weeks, a longer homeschool unit; short or extended sessions |
| Learner fit | Age, existing skills, interests, reading/writing comfort, independence, helpful supports |
| Academic connections | Math, reading, writing, critical thinking, creative thinking, science, history, or other useful subjects |
| Materials | Workbooks, full reading passages, hands-on projects, experiments, discussion, games, digital interaction |
| Family circumstances | Supplies, budget, adult preparation, language, printer, screens, space, multiple children |

Learning preferences inform the activities alongside actual readiness. Gender and pronouns are optional details; they do not determine interests or ability. The workflow offers multiple ways to engage, with support, deeper challenges, and shorter routes for busy days.

## What every complete course includes

- An achievable schedule, progressive learning goals, and a meaningful final project or portfolio.
- Actual teaching content, worked examples, activities, and enough space to respond.
- All selected long readings written in full.
- A **parent/teacher guidebook** with preparation, session notes, prompts, complete answer keys, and assessment criteria.
- **Printable PDFs of all instructional materials**, with a print plan and separate adult answers.
- Editable sources, needed visual assets, and printable equivalents of selected digital activities.
- An honest quality report and a saved brief for continuing or revising the course.

File and image generation require those tools in the session. A course is not “complete” if its promised PDFs or activities are missing. See [setup and troubleshooting](docs/CHATGPT-WORK-SETUP.md) and [common questions](docs/FAQ.md).

## Try a quick start

```text
Quick start: Build a four-week fashion design course for an 11-year-old beginner who enjoys drawing and making things. Two 45-minute sessions per week. Integrate measurement, reading, persuasive writing, critical thinking, and creative thinking. Include full reading passages, a workbook, hands-on activities, printable PDFs, and a parent/teacher guide. Use paper and household supplies. Choose sensible defaults and build the complete pack.
```

Or start with something open-ended: “My child loves animals and solving mysteries. Help us choose a course.”

## See a finished example

**Pocket Lab** is an original one-week, two-session fashion-design mini-course: a 630-word reading, measurement problems, two design sketches, a paper prototype, and a test-and-revise challenge.

- [Learner pack — 8 pages](output/pdf/Pocket-Lab-Learner.pdf)
- [Parent/teacher guide — 5 pages](output/pdf/Pocket-Lab-Parent-Teacher-Guide.pdf)
- [Sample course brief and print plan](examples/pocket-lab/course-brief.md)
- [Printable starter guide](output/pdf/Course-Studio-Start-Here.pdf)

The sample pages and calculations have been checked. It has **not yet been piloted with a child**. It shows a small complete course; your requested course should be built to its full agreed length.

## Use it in Codex

Paste the same repository setup request into Codex, or ask its skill installer:

```text
Use $skill-installer to install the skill at https://github.com/leesalminen/course-studio/tree/main/skills/course-studio, then use $course-studio to start the guided parent interview.
```

When the skill is already installed, simply use `$course-studio`. Setup should detect an existing installation and preserve local edits. [More setup details](docs/CHATGPT-WORK-SETUP.md#persistent-installation).

## Share and contribute

Send a friend **[this repository](https://github.com/leesalminen/course-studio)** and the one-message prompt above, or download the **[starter kit ZIP](https://github.com/leesalminen/course-studio/raw/refs/heads/main/Course-Studio-Starter-Kit.zip)**.

The reusable instructions and original example are available under the [MIT license](LICENSE). Each family works in its own conversation. Keep private course briefs, child details, and generated family materials out of public contributions.

- [Setup instructions for the assistant](docs/CHATGPT-WORK-SETUP.md)
- [Common questions](docs/FAQ.md)
- [Skill source](skills/course-studio/SKILL.md)
- [Maintainer guide](docs/MAINTAINING.md)
- [Validation notes and test scenarios](validation/quality-check.md)

Course Studio is an independent community project and is not affiliated with OpenAI.
