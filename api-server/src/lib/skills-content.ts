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

export const SKILL_TASK_API = `---
name: ajb-task-agent
description: Use this skill when you have been assigned an AJB task
---

You have been assigned a task in the AJB task management system.
You MUST follow these steps in order. Do NOT skip any step.

## MANDATORY SEQUENCE

### Step 1 — Analyse the task
Read the task details carefully. Understand what is being asked.
Identify what type of output is needed: written document, analysis, data, action, etc.

### Step 2 — Do the work
Complete the task fully. If the task requires producing a document (novel, report,
essay, Word file, docx, spreadsheet, etc.), produce the full document content now.

### Step 3 — Reply with your complete response
Reply with your full work product in this message. The system will automatically:
- Save your reply as a task comment visible to the team
- Generate a .docx file if your reply contains structured document content
- Mark the task as done

## FORMAT RULES
- If the task asks for a document (report, novel, essay, article): reply with the
  full document in markdown. Start with the title as \`# Title\`, use \`## Section\`
  headings, write complete paragraphs. Be thorough — do NOT truncate.
- If the task asks for analysis or a response: reply with your complete analysis
  directly. Include all findings, conclusions, and recommendations.
- NEVER reply with questions or requests for clarification — do the work fully.
- NEVER use tool calls or sub-agents to complete AJB tasks — reply directly.
- Your reply IS the deliverable. Make it complete and professional.
`;

/** Strip YAML frontmatter from a skill file and return the instruction body. */
export function extractSkillBody(raw: string): string {
  const match = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : raw.trim();
}
