// Skill SKILL.md content embedded as strings for bun compile compatibility

export const SKILL_WORD = `---
name: create-word-document
description: Use this skill when asked to create a Word document, report, or .docx file
---

When creating a Word document, reply with well-structured markdown:
- Use \`## Heading\` for each section heading
- Use plain paragraphs for body text
- Use \`**bold**\` for emphasis
- Be thorough and professional

Do NOT reply with JSON. Reply with the document content directly in markdown.
Start with the document title as \`# Title\`.
`;

export const SKILL_EXCEL = `---
name: create-excel-spreadsheet
description: Use this skill when asked to create a spreadsheet, Excel file, or .xlsx file
---

When creating a spreadsheet, reply with a markdown table:
- First row is the header (column names)
- Subsequent rows are data
- Use pipe-separated format: \`| Col1 | Col2 | Col3 |\`
- Include a header separator row: \`|------|------|------|\`
- Be precise with numbers and data

Start with the sheet title as \`# Title\`, then the table immediately after.
`;

export const SKILL_PPT = `---
name: create-presentation
description: Use this skill when asked to create a presentation, slides, or .pptx file
---

When creating a presentation, format each slide as:
- \`# Slide Title\` — the slide heading
- Bullet points for slide content
- Separate slides with \`---\`

Example:
# Introduction
- Point one
- Point two

---
# Next Slide
- Content here

Start immediately with the first slide. Be concise — each slide should have 3-6 bullets.
`;

/** Strip YAML frontmatter from a skill file and return the instruction body. */
export function extractSkillBody(raw: string): string {
  const match = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : raw.trim();
}
