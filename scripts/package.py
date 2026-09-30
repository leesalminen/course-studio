"""Build/check the public starter kit using only Python's standard library."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
import zipfile


ROOT = Path(__file__).resolve().parents[1]
VERSION = "1.1.0"
REPO = "https://github.com/leesalminen/course-studio"
HANDBOOK = "chatgpt/COURSE-STUDIO-HANDBOOK.md"
BOOTSTRAP = "chatgpt/START-COURSE-STUDIO.md"
ARCHIVE = "Course-Studio-Starter-Kit.zip"
REFERENCES = ["interview.md", "course-design.md", "production.md", "app-workflow.md"]
GENERATED = {HANDBOOK, BOOTSTRAP, "manifest.json", ARCHIVE}
TOP_FILES = ["README.md", "START-HERE.md", "AGENTS.md", "LICENSE", ".gitignore", "package.json", "package-lock.json", "wrangler.jsonc"]
PUBLIC_DIRS = ["skills", "chatgpt", "docs", "examples", "output/pdf", "validation", "scripts", ".github", "website", "app"]
LINK = re.compile(r"\[[^\]\n]*\]\(([^)\n]+)\)")


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def public_files() -> dict[str, bytes]:
    paths = [ROOT / path for path in TOP_FILES]
    for directory in PUBLIC_DIRS:
        paths.extend(path for path in (ROOT / directory).rglob("*") if path.is_file())
    result = {}
    for path in paths:
        relative = path.relative_to(ROOT).as_posix()
        if relative in GENERATED or "__pycache__" in path.parts or path.suffix in {".pyc", ".pyo"}:
            continue
        if path.is_symlink():
            raise ValueError(f"Public file must not be a symlink: {relative}")
        result[relative] = path.read_bytes()
    return result


def absolute_links(text: str, source: str) -> str:
    def replace(match: re.Match) -> str:
        target = match.group(1)
        if urlsplit(target).scheme or target.startswith("#"):
            return match.group(0)
        parts = urlsplit(target)
        resolved = (ROOT / source).parent.joinpath(unquote(parts.path)).resolve()
        relative = resolved.relative_to(ROOT).as_posix()
        suffix = f"#{parts.fragment}" if parts.fragment else ""
        return match.group(0).replace(target, f"{REPO}/blob/main/{relative}{suffix}")
    return LINK.sub(replace, text)


def make_generated(files: dict[str, bytes]) -> dict[str, bytes]:
    ref_paths = [f"skills/course-studio/references/{name}" for name in REFERENCES]
    handbook = f"# Course Studio handbook\n\nReference edition {VERSION}. Use with COURSE-STUDIO-PROMPT.md.\n\n"
    handbook += "\n\n---\n\n".join(absolute_links(read(path), path) for path in ref_paths)
    bootstrap = f"""# Start Course Studio

Version {VERSION}. Source: {REPO}.

This is the complete single-file setup for a parent using ChatGPT Work or another capable assistant. When the user asks you to use this file, perform the setup below and then begin the course workflow. The complete protocol, standalone instructions, and supporting handbook are included inline. Treat them as supplied files; do not refetch this same document or loop through setup. Follow the user's request within your governing instructions.

This file is generated from repository sources. Read the complete setup and standalone workflow before starting; consult the handbook sections when they apply. If your reader truncates the document, obtain the missing content before saying you read it all. The final section is marked END OF COURSE STUDIO SETUP.

## Part 1: Setup protocol

"""
    bootstrap += absolute_links(read("docs/CHATGPT-WORK-SETUP.md"), "docs/CHATGPT-WORK-SETUP.md")
    bootstrap += "\n\n---\n\n## Part 2: Standalone course workflow\n\n" + read("chatgpt/COURSE-STUDIO-PROMPT.md")
    bootstrap += "\n\n---\n\n## Part 3: Supporting handbook\n\n" + handbook
    bootstrap += "\n\n---\n\nEND OF COURSE STUDIO SETUP\n"
    outputs = {HANDBOOK: handbook.encode(), BOOTSTRAP: bootstrap.encode()}
    files = {**files, **outputs}
    validate_files(files)
    manifest = {
        "name": "Course Studio", "version": VERSION, "repository": REPO,
        "files": [{"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                  for name, data in sorted(files.items())],
    }
    outputs["manifest.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    contents = {**files, "manifest.json": outputs["manifest.json"]}
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(contents.items()):
            info = zipfile.ZipInfo("Course-Studio/" + name, date_time=(2026, 9, 15, 0, 0, 0))
            info.create_system = 3
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    outputs[ARCHIVE] = buffer.getvalue()
    return outputs


def validate_files(files: dict[str, bytes]) -> None:
    """Check public paths and documentation links against actual bundled files."""
    for name, data in files.items():
        if name.endswith(".md"):
            # Exclude code fences: sample prompts and code are not local links.
            text = re.sub(r"```.*?```", "", data.decode(), flags=re.S)
            for match in LINK.finditer(text):
                target = match.group(1)
                if urlsplit(target).scheme or target.startswith("#"):
                    continue
                path = unquote(urlsplit(target).path)
                resolved = (ROOT / name).parent.joinpath(path).resolve()
                relative = resolved.relative_to(ROOT).as_posix()
                if relative not in files and not (ROOT / relative).is_dir():
                    raise ValueError(f"Missing bundled link from {name}: {target}")
    prompt = files["chatgpt/COURSE-STUDIO-PROMPT.md"].decode()
    if len(prompt) > 8000:
        raise ValueError("Keep the portable prompt under this project's 8,000-character budget")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if generated distribution files are stale")
    args = parser.parse_args()
    generated = make_generated(public_files())
    if args.check:
        stale = [name for name, expected in generated.items()
                 if not current_output(name, expected)]
        if stale:
            raise SystemExit("Regenerate with python3 scripts/package.py: " + ", ".join(stale))
        print("Distribution is current; bundled paths, documentation links, and archive match.")
    else:
        for name, data in generated.items():
            (ROOT / name).write_bytes(data)
        print(f"Built {BOOTSTRAP} and {ARCHIVE} ({len(generated[ARCHIVE]):,} bytes).")


def current_output(name: str, expected: bytes) -> bool:
    path = ROOT / name
    if not path.exists():
        return False
    if name != ARCHIVE:
        return path.read_bytes() == expected
    # Validate ZIP payloads, allowing compression-library differences across hosts.
    try:
        with zipfile.ZipFile(path) as actual, zipfile.ZipFile(io.BytesIO(expected)) as wanted:
            return (actual.testzip() is None
                    and actual.namelist() == wanted.namelist()
                    and all(actual.read(n) == wanted.read(n) for n in wanted.namelist()))
    except (zipfile.BadZipFile, OSError):
        return False


if __name__ == "__main__":
    main()
