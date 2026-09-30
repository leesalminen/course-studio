import PDFDocument from 'pdfkit';
import { zipSync, strToU8 } from 'fflate';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const spanishLabels = {
  'START HERE': 'EMPIEZA AQUÍ', 'What you will learn': 'Lo que aprenderás', 'Your final project': 'Tu proyecto final',
  'Start here': 'Empieza aquí', 'Print plan': 'Plan de impresión', 'Supplies': 'Materiales', 'Assumptions': 'Supuestos',
  'Gather': 'Prepara los materiales', 'A worked example': 'Un ejemplo resuelto', 'Try it': 'Pruébalo',
  'Your thinking': 'Tus ideas', 'Look back': 'Reflexiona', 'Ways to make it yours': 'Adáptalo a tu manera',
  'Prepare': 'Preparación', 'Timing': 'Tiempo', 'What to explain': 'Qué explicar', 'Questions to ask': 'Preguntas para conversar',
  'Common sticking points': 'Dificultades comunes', 'Adult supervision': 'Supervisión adulta', 'Answers and criteria': 'Respuestas y criterios',
  'Adapt': 'Adaptaciones', 'Source and verification notes': 'Fuentes y notas de verificación', 'The final project': 'El proyecto final',
  'Portfolio checklist': 'Lista del portafolio', 'Weekly feedback': 'Comentarios semanales', 'Where to go next': 'Próximos pasos',
  'Printing': 'Impresión', 'What has been checked': 'Qué se ha comprobado', 'Review before teaching': 'Revisa antes de enseñar',
  'Open the parent guide first. Read the adult supervision notes and check the teaching content and answers before using the course. Print the learner pack separately from the adult answers.': 'Abre primero la guía para familias. Lee las notas de supervisión y revisa el contenido y las respuestas antes de usar el curso. Imprime los materiales del estudiante por separado de las respuestas para adultos.',
  'The app checked the number of weeks and sessions, structured content fields, session timing totals, and answer correspondence. It generated the files listed in the manifest.': 'La aplicación comprobó la cantidad de semanas y sesiones, los campos de contenido, la suma de tiempos y la correspondencia entre preguntas y respuestas. Generó los archivos indicados en el inventario.',
  'This is an AI-written draft. Factual accuracy, educational fit, and final rendered pages still need adult review. No independent source research or child pilot was performed. This text edition has no generated illustrations or digital activities.': 'Este borrador fue escrito con inteligencia artificial. Una persona adulta debe revisar los hechos, la adecuación educativa y las páginas finales. No se realizó investigación independiente ni una prueba con estudiantes. Esta edición de texto no incluye ilustraciones generadas ni actividades digitales.',
};

function pdf(root, paper, title, author, language) {
  const doc = new PDFDocument({ size: paper === 'Letter' ? 'LETTER' : 'A4', margin: 52, bufferPages: true, info: { Title: title, Author: 'Course Studio' } });
  doc.registerFont('Body', join(root, 'website/assets/dm-sans-400.ttf'));
  doc.registerFont('Bold', join(root, 'website/assets/dm-sans-600.ttf'));
  doc.registerFont('Display', join(root, 'website/assets/fraunces-400.ttf'));
  const chunks = [];
  const done = new Promise((resolve, reject) => { doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  const localize = value => language === 'Spanish' ? spanishLabels[value] ?? value : value;
  const room = height => { if (doc.y + height > doc.page.height - 62) doc.addPage(); };
  const heading = (value, level = 2) => {
    if (doc.y > doc.page.height - 130) doc.addPage();
    doc.font(level === 1 ? 'Display' : 'Bold').fontSize(level === 1 ? 30 : 16).fillColor('#294c3e').text(localize(value));
    doc.moveDown(.6); doc.font('Body').fontSize(12).fillColor('#25352c');
  };
  const paragraph = value => { doc.font('Body').fontSize(12).fillColor('#25352c').text(localize(value), { lineGap: 3 }); doc.moveDown(.6); };
  const items = values => values.forEach((value, i) => paragraph(`${i + 1}. ${value}`));
  const lines = count => {
    for (let i = 0; i < count; i++) {
      if (doc.y > doc.page.height - 80) doc.addPage();
      const y = doc.y + 18;
      doc.strokeColor('#819083').lineWidth(.5).moveTo(52, y).lineTo(doc.page.width - 52, y).stroke();
      doc.y = y + 5;
    }
    doc.moveDown(.6);
  };
  heading(title, 1); paragraph(author);
  const question = (value, count) => {
    doc.font('Body').fontSize(12);
    room(doc.heightOfString(value, { width: doc.page.width - 104, lineGap: 3 }) + count * 23 + 25);
    paragraph(value); lines(count);
  };
  return { doc, heading, paragraph, items, lines, question, async finish() {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Body').fontSize(9).fillColor('#58665a').text(`Course Studio | ${i + 1} / ${range.count}`, 52, doc.page.height - 38, { lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end(); return { bytes: await done, pages: range.count };
  } };
}

export async function publishCourse(root, directory, job) {
  const { brief, preview, lessons, guide } = job;
  const es = brief.language === 'Spanish';
  const fit = es ? `${brief.weeks} semana${brief.weeks === 1 ? '' : 's'} | ${brief.sessionsPerWeek} ${brief.sessionsPerWeek === 1 ? 'sesión' : 'sesiones'} por semana | ${brief.minutes} minutos | Español` : `${brief.weeks} week${brief.weeks === 1 ? '' : 's'} | ${brief.sessionsPerWeek} session${brief.sessionsPerWeek === 1 ? '' : 's'} each week | ${brief.minutes} minutes | English`;
  const learner = pdf(root, brief.paper, preview.title, fit, brief.language);
  learner.paragraph(preview.promise); learner.heading('What you will learn'); learner.items(preview.goals);
  learner.heading('Your final project'); learner.paragraph(preview.capstone);
  const parent = pdf(root, brief.paper, `${preview.title}: ${es ? 'Guía para familias y docentes' : 'Parent / Teacher Guide'}`, fit, brief.language);
  parent.heading('Start here'); parent.paragraph(guide.startHere);
  parent.heading('Print plan'); parent.paragraph(guide.printPlan);
  parent.heading('Supplies'); parent.items(guide.supplies);
  parent.heading('Assumptions'); parent.items(preview.assumptions);
  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const id = `W${Math.floor(i / brief.sessionsPerWeek) + 1}-S${i % brief.sessionsPerWeek + 1}`;
    learner.doc.addPage(); const page = learner.doc.bufferedPageRange().count;
    learner.heading(`${id}: ${lesson.title}`, 1);
    learner.paragraph(lesson.purpose); learner.heading('Gather'); learner.items(lesson.materials);
    for (const block of lesson.blocks) {
      learner.heading(`${block.title} (${block.minutes} min)`);
      learner.paragraph(block.teaching); learner.heading('A worked example'); learner.paragraph(block.example);
      learner.heading('Try it'); learner.items(block.steps);
    }
    learner.heading('Your thinking');
    lesson.questions.forEach((q, n) => learner.question(`${id}-Q${n + 1}: ${q.prompt}`, q.lines));
    learner.heading('Look back'); learner.paragraph(lesson.reflection); learner.lines(3);
    learner.heading('Ways to make it yours'); learner.paragraph(`${es ? 'Un poco de ayuda' : 'A little support'}: ${lesson.support}`);
    learner.paragraph(`${es ? 'Un reto opcional' : 'An optional stretch'}: ${lesson.challenge}`); learner.paragraph(`${es ? 'Una ruta más corta' : 'A shorter route'}: ${lesson.shorterRoute}`);
    parent.doc.addPage(); parent.heading(`${id}: ${lesson.title}`, 1);
    parent.paragraph(es ? `Materiales del estudiante: empiezan en la página ${page}. Preguntas ${id}-Q1 a ${id}-Q${lesson.questions.length}.` : `Learner pack: starts on page ${page}. Questions ${id}-Q1 to ${id}-Q${lesson.questions.length}.`);
    parent.heading('Prepare'); parent.paragraph(lesson.parent.preparation);
    parent.heading('Timing'); parent.items(lesson.blocks.map(b => `${b.title}: ${b.minutes} ${es ? 'minutos' : 'minutes'}`));
    parent.heading('What to explain'); parent.paragraph(lesson.parent.explanation);
    parent.heading('Questions to ask'); parent.items(lesson.parent.prompts);
    parent.heading('Common sticking points'); parent.items(lesson.parent.misconceptions);
    parent.heading('Adult supervision'); parent.paragraph(lesson.parent.safety);
    parent.heading('Answers and criteria'); lesson.questions.forEach((q, n) => parent.paragraph(`${id}-Q${n + 1}: ${q.answer}`));
    parent.heading('Adapt'); parent.paragraph(lesson.support); parent.paragraph(lesson.challenge); parent.paragraph(lesson.shorterRoute);
    parent.heading('Source and verification notes'); parent.items(lesson.sourceNotes);
  }
  parent.heading('The final project'); parent.paragraph(preview.capstone); parent.paragraph(guide.rubric);
  parent.heading('Portfolio checklist'); parent.items(guide.portfolio);
  parent.heading('Weekly feedback'); parent.paragraph(guide.feedback); parent.lines(8);
  parent.heading('Where to go next'); parent.paragraph(guide.nextSteps);
  const start = pdf(root, brief.paper, 'START HERE', preview.title, brief.language);
  start.paragraph(fit); start.paragraph('Open the parent guide first. Read the adult supervision notes and check the teaching content and answers before using the course. Print the learner pack separately from the adult answers.');
  start.heading('Printing'); start.paragraph(es ? `Papel ${brief.paper}. Imprime al 100% de escala; puedes usar blanco y negro. Se incluyen líneas para responder. Esta edición no contiene plantillas de escala exacta.` : `${brief.paper} paper. Print at 100% scale, with black-and-white printing supported. Response lines are included. No exact-scale templates are included in this edition.`);
  start.heading('What has been checked'); start.paragraph('The app checked the number of weeks and sessions, structured content fields, session timing totals, and answer correspondence. It generated the files listed in the manifest.');
  start.heading('Review before teaching'); start.paragraph('This is an AI-written draft. Factual accuracy, educational fit, and final rendered pages still need adult review. No independent source research or child pilot was performed. This text edition has no generated illustrations or digital activities.');
  const results = await Promise.all([start.finish(), learner.finish(), parent.finish()]);
  const names = ['START-HERE.pdf', 'Learner-Pack.pdf', 'Parent-Teacher-Guide.pdf'];
  const manifest = { version: 1, title: preview.title, status: 'draft-needs-adult-review', paper: brief.paper, files: results.map((r, i) => ({ name: names[i], pages: r.pages })), checks: ['schedule coverage', 'timing totals', 'structured fields', 'question/answer correspondence'], unverified: ['factual accuracy', 'educational fit', 'rendered-page inspection', 'child pilot'] };
  const files = Object.fromEntries(results.map((r, i) => [names[i], new Uint8Array(r.bytes)]));
  files['course.json'] = strToU8(JSON.stringify({ brief, preview, lessons, guide }, null, 2));
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  files['quality-check.md'] = strToU8('# Draft review\n\nPerformed: schedule coverage, structured fields, timing totals, question/answer correspondence.\n\nUnverified: factual accuracy, educational fit, all rendered PDF pages, child pilot. Review the PDFs and answer keys before teaching.\n');
  files['Course-Pack.zip'] = zipSync(files);
  for (const [name, bytes] of Object.entries(files)) await writeFile(join(directory, name), bytes, { mode: 0o600 });
  return manifest.files.concat([{ name: 'Course-Pack.zip' }, { name: 'course.json' }, { name: 'quality-check.md' }]);
}
