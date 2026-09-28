// Builds docs/PROGRESS_REPORT.docx and docs/PROGRESS_REPORT.md from docs/progress/report.json.
// To update the report: edit report.json, then run `node build_report.js` in this folder
// (first time only: `npm install`).
const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  Footer,
  PageNumber,
} = require("docx");

const FONT = "Times New Roman";
const BODY_SIZE = 24; // half-points, 12pt
const LINE_1_5 = 360;
const AUTHOR = "Dilcon Kuria Kihoro";

const report = JSON.parse(fs.readFileSync(path.join(__dirname, "report.json"), "utf8"));

function assertClean(text) {
  if (/[—–]/.test(text)) {
    throw new Error(`em or en dash found in report text: ${text.slice(0, 60)}`);
  }
}

// "**bold**" inline markup -> runs.
function runs(text, extra = {}) {
  assertClean(text);
  return text.split("**").map(
    (part, i) => new TextRun({ text: part, font: FONT, size: BODY_SIZE, bold: i % 2 === 1, ...extra })
  );
}

function block(b) {
  switch (b.t) {
    case "title":
      assertClean(b.text);
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: b.text, font: FONT, size: 32, bold: true })],
      });
    case "center":
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: b.after ?? 40 },
        children: runs(b.text),
      });
    case "h1":
      assertClean(b.text);
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 150, line: LINE_1_5 },
        children: [new TextRun({ text: b.text, font: FONT, size: 30, bold: true })],
      });
    case "h2":
      assertClean(b.text);
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120, line: LINE_1_5 },
        children: [new TextRun({ text: b.text, font: FONT, size: 26, bold: true })],
      });
    case "p":
      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: LINE_1_5, after: 200 },
        children: runs(b.text),
      });
    case "ul":
    case "ol":
      return b.items.map(
        (item) =>
          new Paragraph({
            numbering: { reference: b.t === "ul" ? "bullets" : "numbers", level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: LINE_1_5, after: 120 },
            children: runs(item),
          })
      );
    default:
      throw new Error(`unknown block type: ${b.t}`);
  }
}

function markdown(blocks) {
  const lines = [];
  for (const b of blocks) {
    if (b.t === "title") lines.push(`# ${b.text}`, "");
    else if (b.t === "center") lines.push(b.text + "  ");
    else if (b.t === "h1") lines.push("", `## ${b.text}`, "");
    else if (b.t === "h2") lines.push("", `### ${b.text}`, "");
    else if (b.t === "p") lines.push(b.text, "");
    else if (b.t === "ul") lines.push(...b.items.map((i) => `- ${i}`), "");
    else if (b.t === "ol") lines.push(...b.items.map((i, n) => `${n + 1}. ${i}`), "");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const children = report.blocks.flatMap(block);

const levelStyle = { paragraph: { indent: { left: 720, hanging: 360 } } };
const doc = new Document({
  creator: AUTHOR,
  lastModifiedBy: AUTHOR,
  title: report.blocks.find((b) => b.t === "title").text,
  description: "Project progress report",
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: levelStyle },
        ],
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: levelStyle },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {},
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: BODY_SIZE })],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const docsDir = path.join(__dirname, "..");
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(path.join(docsDir, "PROGRESS_REPORT.docx"), buffer);
  fs.writeFileSync(path.join(docsDir, "PROGRESS_REPORT.md"), markdown(report.blocks));
  console.log("wrote docs/PROGRESS_REPORT.docx and docs/PROGRESS_REPORT.md");
});
