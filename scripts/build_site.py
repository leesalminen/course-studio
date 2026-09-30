"""Stage only public website files and the four intended downloads."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "dist/site"
if SITE.exists():
    shutil.rmtree(SITE)
shutil.copytree(ROOT / "website", SITE)
downloads = SITE / "downloads"
downloads.mkdir()
for source in ["output/pdf/Pocket-Lab-Learner.pdf", "output/pdf/Pocket-Lab-Parent-Teacher-Guide.pdf", "chatgpt/START-COURSE-STUDIO.md", "Course-Studio-Starter-Kit.zip"]:
    shutil.copy2(ROOT / source, downloads / Path(source).name)
print(f"Public site staged in {SITE}")
