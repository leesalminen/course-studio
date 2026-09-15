from pathlib import Path
from html import escape
import argparse, json, re
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Flowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
EX = ROOT / 'examples/pocket-lab'
for p in [OUT, EX]: p.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description='Rebuild the published example and/or starter guide; not required for parent setup.')
parser.add_argument('--only', choices=['all', 'starter', 'sample'], default='all')
parser.add_argument('--font-dir', type=Path, default=Path('/usr/share/fonts/noto'))
args = parser.parse_args()
FONT = args.font_dir
for alias, name in [('Body','NotoSans-Regular.ttf'),('Bold','NotoSans-Bold.ttf'),('Serif','NotoSerif-Regular.ttf')]:
    pdfmetrics.registerFont(TTFont(alias, str(FONT/name)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Body',boldItalic='Bold')
INK=HexColor('#26363A'); ACCENT=HexColor('#32665D'); LINE=HexColor('#8A9793'); LIGHT=HexColor('#F1F5F2')
styles = {
 'body':ParagraphStyle('body',fontName='Body',fontSize=11.8,leading=16.7,textColor=INK,spaceAfter=8),
 'small':ParagraphStyle('small',fontName='Body',fontSize=9.8,leading=14,textColor=INK,spaceAfter=6),
 'title':ParagraphStyle('title',fontName='Serif',fontSize=28,leading=33,textColor=INK,spaceAfter=15),
 'h2':ParagraphStyle('h2',fontName='Bold',fontSize=14,leading=20,textColor=ACCENT,spaceBefore=8,spaceAfter=7),
 'label':ParagraphStyle('label',fontName='Bold',fontSize=9.2,leading=13,textColor=ACCENT,spaceAfter=9),
}
archive=[]
def P(text,style='body'):
    text=text.replace('–','-').replace('—','-').replace('‑','-')
    archive.append(re.sub('<[^>]*>','',text))
    return Paragraph(text,styles[style])
def head(k,t): return [P(k.upper(),'label'),P(t,'title')]
def para(text): return P(escape(text))
def question(q,text): return P(f'<b>{q}</b>  {escape(text)}')
class Lines(Flowable):
    def __init__(self,n=3): Flowable.__init__(self); self.width=468; self.height=n*23+6; self.n=n
    def draw(self):
        self.canv.setStrokeColor(LINE);self.canv.setLineWidth(.55)
        for i in range(self.n): self.canv.line(0,self.height-23*(i+1),468,self.height-23*(i+1))
class Sketch(Flowable):
    def __init__(self,labels,height=130): Flowable.__init__(self);self.labels=labels;self.width=468;self.height=height
    def draw(self):
        c=self.canv; gap=14;w=(468-gap*(len(self.labels)-1))/len(self.labels)
        c.setStrokeColor(LINE);c.setFillColor(INK);c.setFont('Body',10)
        for i,l in enumerate(self.labels):
            x=i*(w+gap);c.rect(x,0,w,self.height-4);c.drawString(x+10,self.height-23,l)
class Pocket(Flowable):
    def __init__(self,full=False):
        Flowable.__init__(self);self.full=full;self.width=468;self.height=530 if full else 160
    def draw(self):
        c=self.canv; scale=72/2.54 if self.full else 8.0; w=14*scale;h=17*scale;x=(468-w)/2;y=20 if self.full else 8
        c.setFillColor(LIGHT);c.setStrokeColor(INK);c.setLineWidth(1);c.rect(x,y,w,h,fill=1)
        c.setFillColor(INK);c.setDash(4,3)
        c.line(x+scale,y,x+scale,y+h);c.line(x+13*scale,y,x+13*scale,y+h)
        c.line(x,y+scale,x+w,y+scale);c.line(x,y+15*scale,x+w,y+15*scale);c.setDash()
        c.setFont('Body',10 if self.full else 8)
        c.drawCentredString(x+w/2,y+h+8,'14 cm cut width' if self.full else 'Design. Test. Improve.')
        if self.full:
            c.drawCentredString(x+w/2,y+h-24,'TOP: fold 2 cm backward')
            c.drawCentredString(x+w/2,y+8*scale,'Finished face: 12 cm x 14 cm')
            c.drawCentredString(x+w/2,y+9,'BOTTOM: fold 1 cm backward')
            c.saveState();c.translate(x-10,y+h/2);c.rotate(90);c.drawCentredString(0,0,'17 cm cut height');c.restoreState()
            c.setFont('Body',9);c.drawString(0,3,'Scale check:');c.line(60,6,60+2*scale,6);c.line(60,2,60,10);c.line(60+2*scale,2,60+2*scale,10);c.drawString(124,3,'2 cm')

def footer(label):
 def draw(c,doc):
    c.setTitle(label);c.setAuthor('Course Studio');c.setSubject('Original educational course generator sample, version 1.0.0')
    c.setStrokeColor(LINE);c.setLineWidth(.5);c.line(72,43,540,43)
    c.setFillColor(INK);c.setFont('Body',8);c.drawString(72,29,f'COURSE STUDIO / {label} / v1.0')
    c.drawRightString(540,29,str(doc.page))
 return draw

def build(name,pages,label,expected):
    story=[]
    for i,page in enumerate(pages):
        if i:story.append(PageBreak())
        story.extend(page)
    path=OUT/name
    SimpleDocTemplate(str(path),pagesize=(612,792),rightMargin=72,leftMargin=72,topMargin=52,bottomMargin=60).build(story,onFirstPage=footer(label),onLaterPages=footer(label))
    count=len(PdfReader(path).pages)
    if count != expected: raise RuntimeError(f'{name}: expected {expected} pages, got {count}')
    return {'filename':name,'pages':count,'paper':'US Letter','version':'1.0.0'}

READING=[
('1 / A small problem worth noticing',
'''At a make-believe school costume studio, a young designer named Ari had a problem. The actors carried message cards between scenes, but the cards kept sliding out of their costumes. One actor tucked a card under a belt. Another held it in one hand and forgot a gesture. Ari first imagined a brilliant silver pocket shaped like a lightning bolt. It looked exciting in a sketch. Then Ari asked a better question: what did the pocket need to do? The answer was simple enough to test. It had to hold three message cards, let an actor reach them quickly, and stay closed at the bottom when the actor moved.'''),
('2 / Turn a wish into a brief',
'''A design brief is a short description of a problem, the person who has it, and what a solution must achieve. Ari wrote: "Create a paper model of a pocket that holds three cards and is easy to use." A paper model would not be a finished costume. It was a quick way to explore an idea before choosing fabric or asking an adult to help with sewing. Ari added constraints: use one sheet of scrap paper for the pocket, attach it to a separate backing sheet, and finish the first model in twelve minutes. Constraints narrowed the choices, but they still left room for imagination.'''),
('3 / Give materials a job',
'''Ari compared two imaginary materials. One was stiff and kept a crisp shape. The other was soft and bent easily. Neither was automatically better. A stiff pocket might be easier to open, but it might stick out awkwardly. A soft pocket might follow a costume's shape, but it could collapse when someone tried to slide in a card. Ari drew two openings: a straight edge and a shallow curve. The sketches were not a competition to make the prettiest picture. Each one suggested a different way to solve the same problem. Labels explained what the drawings alone could not show.'''),
('4 / Measure what disappears',
'''The next surprise came from folding. Ari wanted the finished pocket to be twelve centimetres wide and fourteen centimetres tall. Cutting a rectangle exactly that size would not work if some paper had to fold behind the edges. Ari allowed one extra centimetre on each side, one at the bottom, and two at the top. Those hidden margins were allowances. They were part of the cut rectangle, but not part of its finished face. Ari drew a larger rectangle and marked each fold before cutting. A ruler turned the design from a guess into something another person could reproduce.'''),
('5 / Let a test change your mind',
'''The first prototype, or early model, looked neat on the table. Ari attached its folded side and bottom tabs to a backing sheet, leaving the top open. Three paper cards fitted inside. That seemed like success, until Ari lifted the backing sheet upright and gently tilted it from side to side. One corner began to open. Instead of calling the whole design a failure, Ari recorded the observation: "The lower left attachment loosened during the tilt test." This was more useful than "bad pocket" because it named something that could change. Ari reinforced that corner, repeated the same test with the same cards, and compared the result. A fair comparison needed a similar test.'''),
('6 / Explain a choice',
'''Ari's final model still looked like folded paper. That was fine. Its job was to help answer a question, not to pretend it was a finished garment. For the studio display, Ari wrote a small label explaining the user, one constraint, and one improvement supported by a test. Another designer chose a different opening and produced an equally thoughtful solution. Good design did not require everyone to make the same object. It required noticing a need, trying possibilities, and explaining decisions. The lightning-bolt decoration could return later, if Ari still wanted it. Now it would belong to a pocket with a purpose.'''),
]
words=len(' '.join(t for _,t in READING).split())
(EX/'reading.md').write_text('# The pocket that had to earn its place\n\nOriginal fictional design scenario.\n\n'+'\n\n'.join(f'## {h}\n\n{t}' for h,t in READING)+'\n',encoding='utf-8')

students=[]
students.append(head('Pocket Lab / one-week mini-course / ages about 10–12','Small pocket.\nBig decisions.') + [
 para('Become a designer for a costume studio. Your challenge: make a paper pocket that holds three message cards, then improve it after a test. You will read, measure, sketch, build, and explain your choices.'),
 P('Your studio schedule','h2'),para('Session 1 · 45 minutes: meet the design problem, read the story, and work out the measurements. Session 2 · 45 minutes: choose a design, build a model, test it, and share what changed.'),
 P('Gather your tools','h2'),para('Pencil, ruler marked in centimetres, scrap paper, one backing sheet, tape, and scissors with adult help as needed. Paper and tape models only; this is not a sewing or wearable-product test.'),
 question('START','Before reading: what makes a pocket useful? Write or tell an adult two ideas.'),Lines(3),
 P('Success looks like this','h2'),para('I can explain a need, calculate a cut size, compare two ideas, and use a test to improve my model. The aim is thoughtful decisions; drawing skill is not being graded.'),
 P('Print note: page 7 is a cutting template. Print single-sided at actual size (100%). Check its 2 cm scale mark.','small')])
for offset in [0,3]:
    p=head('R01 / original fictional design story'+(' / continued' if offset else ''),'The pocket that had\nto earn its place')
    for h,t in READING[offset:offset+3]:p += [P(h,'h2'),para(t)]
    students.append(p)
students.append(head('W01-S01 / reading response','Read like a designer')+[
 para('Use the story on pages 2–3. You may write short answers, dictate, or discuss and let an adult jot down your ideas.'),
 question('Q01','Name two things the actors needed the pocket to do. Where did you find them?'),Lines(3),
 question('Q02','Why was “The lower left attachment loosened” more useful than “bad pocket”? Use an idea from section 5.'),Lines(3),
 question('Q03','Invent a different constraint for a pocket. Explain one design choice that your constraint might change.'),Lines(4),
 P('Designer words','h2'),para('Brief: the problem and requirements. Constraint: a limit you must work within. Allowance: extra material outside the finished face. Prototype: an early model used to explore or test an idea.'),
 P('Return to your starting ideas on page 1. Circle or tell an adult one idea you would now make more specific.','small')])
students.append(head('W01-S01 / measurement studio','Measure what folds away')+[
 para('The finished face is the visible rectangle after the margins fold backward. For this simple model, add both side allowances to the finished width. Add the top and bottom allowances to the finished height.'),
 P('Worked example','h2'),para('A finished face 8 cm wide and 10 cm tall needs 1 cm on each side, 1 cm at the bottom, and 2 cm at the top. Cut width = 8 + 1 + 1 = 10 cm. Cut height = 10 + 1 + 2 = 13 cm.'),
 question('Q04','Our finished face is 12 cm wide and 14 cm tall. Use the same allowances. What width and height should you cut? Show both calculations.'),Lines(3),
 question('Q05','You have two scrap rectangles: A is 15 × 20 cm; B is 13 × 25 cm. Which can fit your entire cut rectangle? Keep edges parallel; you may turn the sheet. Explain why.'),Lines(3),
 P('Check with your adult before cutting','h2'),para('Compare your calculated cut size to the template on page 7. Measure its outside edges and scale mark. If the printer changed its size, draw your own rectangle using your calculated dimensions.'),
 P('Optional stretch (extra time): How many square centimetres are in one cut rectangle? How much for two?','small')])
students.append(head('W01-S02 / design choices','Two ideas. One decision.')+[
 para('Keep the same rectangular pocket face and allowances so the template still works. Your choices can change decoration, labels, opening details above the fold, or how a user finds the cards. Do not cut below the top fold line.'),
 question('Q06','Sketch two possibilities. Label a useful feature in each. Choose one and explain how it helps the user.'),Sketch(['IDEA A','IDEA B'],170),Lines(3),
 P('Build your first prototype','h2'),para('1. Use the page 7 template or draw the measured rectangle on scrap paper. Cut only the solid outside edge.\n2. Fold each dashed line backward.\n3. Attach the folded side and bottom tabs to a backing sheet with tape. Leave the top opening free.\n4. Cut three scrap-paper cards, each 5 × 7 cm. Label them 1, 2, and 3.'),
 para('Use only paper cards for testing. An adult can help with cutting or hold the paper while you fold. Keep your sketch nearby so you can compare your plan to your model.'),
 P('Design note: the illustration is a rectangle-fold model, not a fabric sewing pattern.','small')])
students.append(head('W01-S02 / template / single-sided / actual size 100%','Cut. Fold. Test.')+[
 P('Cut the solid outside edge. Fold dashed lines backward. Print at 100%; the scale check must measure exactly 2 cm. Side folds are 1 cm each.','small'),Pocket(True)])
students.append(head('W01-S02 / test and revise','Let the evidence help')+[
 question('Q07','Put all three cards in the pocket. Lift the backing sheet upright and gently tilt it left and right five times. Try removing and replacing one card. What happened?'),Lines(3),
 question('Q08','Change one feature or attachment. Predict what it will improve. Repeat the same test with the same cards. What changed in the result? If the first model worked, improve ease of use or explain a tradeoff.'),Lines(4),
 question('Q09','Write or dictate a 3–4 sentence museum label: who is this for, what choice did you make, and what did your test teach you? Include one measurement.'),Lines(5),
 P('Studio reflection','h2'),para('Finish aloud: “At first I thought… Now I would…” Keep your two sketches, calculations, and test notes with your model. These show your design thinking.'),
 P('Optional challenge: predict whether a wider card would change your design. Test only if you have extra time.','small')])

teacher=[]
teacher.append(head('Pocket Lab / parent & teacher guide','Your studio, ready to teach')+[
 para('An original one-week mini-course for a beginner around 11 who can read a sustained passage with support and add whole-number centimetres. Two 45-minute sessions. This sample demonstrates Course Studio with original teaching material.'),
 P('Open and print','h2'),para('Use Pocket-Lab-Learner.pdf (8 pages) and this separate guide (5 pages). Print learner pages 1–8 in black-and-white. Page 7 must be single-sided at actual size / 100%; verify the 2 cm mark. Other pages may be double-sided. Keep this answer guide for adult use; printing it is optional.'),
 P('Supplies and preparation','h2'),para('Allow about 10 minutes before session 1 to review this guide and gather a centimetre ruler, pencil, tape, scissors, at least two usable scrap sheets plus paper for three 5 × 7 cm cards, and a backing sheet. No purchase is assumed. Check the template scale. For session 2, allow about 3 minutes to set out supplies.'),
 P('What the learner will demonstrate','h2'),para('Identify a design need; explain a constraint; add allowances to two dimensions; compare feasible paper sizes; generate two options; record an observation; revise and explain a choice using evidence.'),
 P('Your role','h2'),para('Launch each session, check the math before cutting, support reading or scissors as needed, and lead the final reflection. Keep help focused on questions and safe handling. This is a taped paper model; it is not designed for sewing, wearing, or holding valuable/heavy objects.'),
 P('Total core learning time: 90 minutes. Estimates depend on the learner; optional challenges are outside the core schedule.','small')])
teacher.append(head('W01-S01 / pages 1–5','Session 1: notice and measure')+[
 P('45-minute route','h2'),para('Launch/start task, 5 min (p. 1). Read together or independently, 12 min (pp. 2–3). Discuss Q01–Q03, 10 min (p. 4). Teach the model and try Q04–Q05, 13 min (p. 5). Review and put materials away, 5 min. If reading takes longer, use oral answers and finish the math next session; update the plan accordingly.'),
 P('Teach the key idea','h2'),para('A pocket solves a need for someone. Its appearance can be creative, but choices also have consequences. Ask: “Who needs this?” “What would count as working?” For measurement, draw the finished face first, then add strips outside it. Width and height get different allowances.'),
 P('Hints before answers','h2'),para('Q01: return to the end of section 1. Q02: ask which description points to a fix. Q04: trace both side margins with a finger, then the top and bottom. Q05: compare both dimensions; a large area alone cannot prove a rectangle will fit.'),
 P('Common confusions','h2'),para('An allowance is not part of the finished face. It must be added before cutting, not subtracted. For Q05, rotating sheet B still leaves one dimension too short. In reading discussion, encourage section evidence rather than guessing what a designer “always” does.'),
 P('Adapt the session','h2'),para('More support: shared reading, read one section then summarize aloud, draw colored or patterned allowance strips, accept dictated answers. Go further: calculate cut areas and explain why comparing areas alone is insufficient. Short 20-minute route: 3 min launch, 7 min adult summary plus section 4, 7 min worked example/Q04, 3 min oral reflection. Read the full passage later; this shorter route defers it.'),
 P('Quick check','h2'),para('Ask the learner to explain where each added centimetre goes. Note whether the explanation is independent, prompted, or needs another example.')])
teacher.append(head('W01-S01 / answer key','Reading and math answers')+[
 P('START / p. 1','h2'),para('Open baseline. Possible ideas: hold objects, stay attached, be easy to reach. Record the learner’s own starting ideas; revisit specificity at the end.'),
 P('Q01 / p. 4','h2'),para('Any two: hold three message cards; allow quick access; stay closed at the bottom during movement. Evidence: section 1, final sentence. Accept faithful paraphrases.'),
 P('Q02 / p. 4','h2'),para('The specific observation names the location and what loosened, so Ari can choose a targeted change and compare a repeat test. Evidence: section 5. “Bad pocket” gives little guidance about what to fix.'),
 P('Q03 / p. 4','h2'),para('Open answer. Example: “The actor must find the pocket in low light, so I would add a large raised paper marker beside its opening.” Look for a genuine constraint and a plausible consequence. Other defensible choices are welcome; the learner need not build this idea.'),
 P('Q04 / p. 5','h2'),para('Cut width = 12 + 1 + 1 = 14 cm. Cut height = 14 + 1 + 2 = 17 cm. Check both dimensions and units. The template outside dimensions must match.'),
 P('Q05 / p. 5','h2'),para('A fits: 15 ≥ 14 and 20 ≥ 17. B does not fit: its 13 cm side is shorter than either 14 or 17 cm. Turning B cannot solve that limit. The question restricts edges to parallel placement; do not introduce diagonal nesting.'),
 P('Optional stretch / p. 5','h2'),para('One cut rectangle: 14 × 17 = 238 cm². Two: 2 × 238 = 476 cm². A larger area does not guarantee a usable shape; compare actual dimensions.'),
 P('Accept oral, written, or drawn explanations. Score the mathematics and reasoning separately from handwriting and spelling.','small')])
teacher.append(head('W01-S02 / pages 6–8','Session 2: build and improve')+[
 P('45-minute route','h2'),para('Recall the brief, 3 min. Sketch/choose Q06 (p. 6), 8 min. Build with pp. 6–7, 12 min. Initial test Q07 (p. 8), 7 min. Revise/retest Q08, 8 min. Label/reflection Q09, 5 min. Cleanup, 2 min.'),
 P('Demonstrate the model','h2'),para('Check template scale and cut size first. Fold side, bottom, and top allowances backward. Tape folded side and bottom tabs to the backing sheet; leave the opening free. Make three paper cards 5 × 7 cm. Model a gentle tilt of the backing sheet. Support scissors and folding as needed; no sewing or body measurements.'),
 P('Open-task criteria and examples','h2'),para('Q06: two distinct, labeled ideas and a chosen feature linked to the user. Example: a large symbol helps the actor locate the pocket. Q07: record what actually happens; there is no predetermined result. Useful observations name card retention, attachment, or access. Q08: name one change, a prediction, and the repeated test result. A change need not work to demonstrate learning.'),
 para('Q09 sample: “This pocket is for an actor carrying message cards. I chose a large arrow to show the opening. My finished face is 12 cm wide. After the lower corner loosened, extra tape kept all three cards in during the repeat tilt test.” This is an illustrative response, not a result students must copy.'),
 P('Adapt the session','h2'),para('Support: adult cuts/pre-folds, learner directs choices and tests; dictate the label. Challenge: compare a second attachment with the same test or discuss strength versus ease of opening. Short 20-minute route: 3 min choose an idea, 6 min assemble a pre-cut model, 7 min test/change/retest, 4 min oral label. Defer the second sketch or complete it another day.'),
 P('Facilitation prompt','h2'),para('“What happened?” before “Was it good?” If everything works, invite a usability improvement or a thoughtful reason to keep the design. Evidence matters more than a dramatic failure.')])
teacher.append(head('Assessment / continuity / provenance','Notice growth, choose next steps')+[
 P('Three useful levels','h2'),para('Starting: identifies a need with help, needs the allowance example repeated, or describes a result vaguely. Working: calculates with a prompt, links a feature to a need, and records a specific test. Secure: explains dimensions independently, compares options using criteria, and connects a change to evidence. Apply these separately to measurement, reasoning, and communication; one overall label can hide uneven strengths.'),
 P('Portfolio and ending check','h2'),para('Keep the initial ideas, Q04 calculations, two sketches, model, and test notes. Ask: “What makes this pocket useful, and how do you know?” Compare with the starting response. An observable gain is moving from “it looks good” to a specific user need plus test evidence. A polished object alone does not prove learning.'),
 P('Family check-in','h2'),para('Record each session’s time, enjoyment, frustration, independence, and one adjustment. Example: split the reading across two days and accept a spoken explanation.'),Lines(2),
 P('Where this could go next','h2'),para('For a longer course, investigate material properties, compare pockets for different users, or design a small paper accessory collection. Add new math or research only after checking readiness and available time.'),
 P('Content and asset notes','h2'),P('The story and activities are original fictional teaching material. Ari and the costume studio are invented. Measurements are constructed examples, checked arithmetically. Pocket outlines and the exact-size template are original vector drawings. No external images, fabric-performance claims, or historical quotations are used. Reading length: '+str(words)+' words. This sample has not been piloted with a child.','small'),
 P('Editable sources and the original vector template are included in the starter kit.','small')])

sample_archive=list(archive)
archive.clear()
start=[]
start.append(head('Course Studio / starter guide / v1.0','A course built around\nyour child’s curiosity')+[
 para('A reusable parent-guided workflow for personalized homeschool units and after-school enrichment, usually ages 9–15. Choose the topic, schedule, academic connections, and materials; the generator helps turn those choices into a complete teaching pack.'),
 P('1 / Tell the story of your learner','h2'),para('Start with what excites them, what they can do comfortably, and what your family hopes to get from the course. The guided interview asks a few questions at a time. Say “quick start” when you prefer suggested defaults.'),
 P('2 / Shape the course','h2'),para('Review a recommended concept, weekly progression, time and supplies, and a real sample activity. Adjust the direction, then ask the generator to build the complete pack.'),
 P('3 / Open the parent guide and begin','h2'),para('Download the learner materials and the separate parent/teacher guide. Print what you need. After trying a session, report what was fun, hard, or too long so the course can improve.'),
 P('Every complete course includes','h2'),para('Printable PDFs of all instructional materials; a parent/teacher guide with session notes and answers; editable sources; a clear print plan. Select workbooks, long readings, hands-on work, and digital interaction to suit your family.'),
 P('Open the included Pocket Lab sample to see the intended level of detail. It is an original one-week fashion-design mini-course with 8 learner pages and a 5-page adult guide.','small')])
start.append(head('Setup / no technical background needed','Use it in ChatGPT or Codex')+[
 P('ChatGPT Work: one message','h2'),para('Paste this into a ChatGPT Work session: “Set up Course Studio from https://github.com/leesalminen/course-studio. Read the README and follow docs/CHATGPT-WORK-SETUP.md. Handle setup with the available tools, then start the guided parent interview.”'),
 para('If links cannot be opened, attach chatgpt/START-COURSE-STUDIO.md from the kit and ask it to follow that file. It includes the complete setup and workflow. The assistant should prepare the conversation and begin a short interview.'),
 P('Codex: invoke the skill','h2'),para('Use $course-studio to help me design a course for my child. Start the guided parent interview.'),
 para('For a first installation, give Codex the repository setup request or ask its skill installer to install skills/course-studio from the repository. Reuse an existing installation.'),
 P('Ready-made quick start','h2'),para('“Create a four-week fashion design course for an 11-year-old beginner who loves drawing. Two 45-minute sessions weekly. Integrate math, reading, writing, critical thinking, and creative thinking. Include full readings, a workbook, hands-on work, all PDFs, and a parent/teacher guide. Use household supplies. Choose sensible defaults and build it.”'),
 P('Tool availability','h2'),para('Actual PDFs require file-generation tools in the session. Artwork may need image generation. If tools are missing, the workflow must clearly identify incomplete exports and provide source content plus a continuation route. The starter kit itself is a reusable workflow, not a hosted application.')])
start.append(head('Share / adapt / improve','A useful first course, then a better one')+[
 P('Send friends the repository or starter kit','h2'),para('Share github.com/leesalminen/course-studio and the README’s one-message prompt, or send Course-Studio-Starter-Kit.zip. Each family works in its own account. Keep private learner briefs and conversations out of the public kit.'),
 P('Make the fit better','h2'),para('Describe actual reading and writing comfort, independence, supplies, and time. Learning preferences can guide choices without locking a child into a fixed learning-style label. Gender does not determine topics or ability.'),
 P('What to ask after trying a session','h2'),para('“We enjoyed the building but the reading took too long. Keep the learning goal, split the passage into two days, and update the schedule and materials.” Or: “The math was easy. Add a deeper measurement challenge without adding much time.”'),
 P('Ready here or installed for later','h2'),para('Setup loads the workflow for the current conversation and uses supported installation tools if available. A folder saved in a temporary workspace does not prove permanent installation. The assistant must say what it actually completed. Future sessions may need the setup prompt and your saved brief again.'),
 P('Sources and fuller instructions','h2'),P('ChatGPT Work: <link href="https://learn.chatgpt.com/docs/web" color="#32665D">Official Work guide</link><br/>Skills: <link href="https://learn.chatgpt.com/docs/build-skills" color="#32665D">Official skill guide</link><br/>Learning preferences: <link href="https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/learning-styles" color="#32665D">EEF evidence summary</link>','small'),
 para('README.md includes the complete package map and setup notes. The sample is original and has not been tested with a child. Use your first session as a chance to learn what fits, then revise.'),
 P('Course Studio / version 1.0.0 / prepared for sharing and adaptation with friends','small')])

jobs=[('Pocket-Lab-Learner.pdf',students,'Pocket Lab / learner',8,'sample'),('Pocket-Lab-Parent-Teacher-Guide.pdf',teacher,'Pocket Lab / adult guide',5,'sample'),('Course-Studio-Start-Here.pdf',start,'Starter guide',3,'starter')]
manifest_path=OUT/'manifest.json'
previous=json.loads(manifest_path.read_text())['artifacts'] if manifest_path.exists() else []
records={entry['filename']:entry for entry in previous}
for filename,pages,label,expected,group in jobs:
    if args.only in ('all',group):
        records[filename]=build(filename,pages,label,expected)
manifest=[records[job[0]] for job in jobs if job[0] in records]
manifest_path.write_text(json.dumps({'version':'1.0.0','artifacts':manifest},indent=2)+'\n')
(EX/'materials-source.md').write_text('# Pocket Lab editable content\n\nParagraphs in learner-pack order, then parent-guide order. Use the PDFs for layout and the SVG for the exact template.\n\n'+'\n\n'.join(sample_archive)+'\n')
svg='''<svg xmlns="http://www.w3.org/2000/svg" width="160mm" height="195mm" viewBox="0 0 160 195"><title>Pocket Lab exact cut template</title><desc>Outer cut rectangle 140 by 170 millimetres; folds 10 mm on left, right and bottom, 20 mm on top. Calibration line 20 mm.</desc><g fill="none" stroke="#26363a" stroke-width="0.4"><rect x="10" y="10" width="140" height="170"/><g stroke-dasharray="2 1.5"><path d="M20 10V180 M140 10V180 M10 30H150 M10 170H150"/></g><path d="M10 188H30 M10 186V190 M30 186V190"/></g><g font-family="sans-serif" font-size="4" fill="#26363a"><text x="80" y="22" text-anchor="middle">TOP: fold 2 cm backward</text><text x="80" y="100" text-anchor="middle">Finished face: 12 cm x 14 cm</text><text x="35" y="189">2 cm scale check</text></g></svg>'''
(EX/'pocket-template.svg').write_text(svg)
print(json.dumps({'reading_words':words,'pdfs':manifest},indent=2))
