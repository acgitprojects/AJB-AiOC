import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import ExcelJS from "exceljs";
import pptxgen from "pptxgenjs";
import * as repo from "../repositories/document-jobs.repository";
import type { DocJobType, DocumentJob } from "../repositories/document-jobs.repository";
import { SKILL_WORD, SKILL_EXCEL, SKILL_PPT, extractSkillBody } from "../lib/skills-content";

const WS_URL = process.env.OPENCLAW_WS_URL ?? "ws://openclaw:18789";
const TOKEN  = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";

// ── Skill bodies ──────────────────────────────────────────────────────────────

const SKILL_BODIES: Record<DocJobType, string> = {
  word:  extractSkillBody(SKILL_WORD),
  excel: extractSkillBody(SKILL_EXCEL),
  ppt:   extractSkillBody(SKILL_PPT),
};

const SKILL_NAMES: Record<DocJobType, string> = {
  word:  "create-word-document",
  excel: "create-excel-spreadsheet",
  ppt:   "create-presentation",
};

// ── Public API ────────────────────────────────────────────────────────────────

export async function createDocumentJob(
  type: DocJobType,
  title: string | null,
  prompt: string,
  agentId: string,
): Promise<DocumentJob> {
  const id = crypto.randomUUID();
  const sessionKey = `agent:${agentId}:doc-${id}`;
  const skillBody = SKILL_BODIES[type];
  const skillName = SKILL_NAMES[type];
  const fullMessage = `[Document Skill: ${skillName}]\n\n${skillBody}\n\n---\n\nPlease create the following:\n${prompt}`;

  const job = await repo.createJob({ id, type, title, prompt, agentId, sessionKey });

  // Fire-and-forget streaming job
  processDocumentJob(id, agentId, sessionKey, fullMessage, type, title).catch(() =>
    repo.fail(id, "Unexpected processing error").catch(() => {})
  );

  return job;
}

// ── WS streaming job processor ────────────────────────────────────────────────

async function processDocumentJob(
  id: string,
  agentId: string,
  sessionKey: string,
  message: string,
  type: DocJobType,
  title: string | null,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const ws = new WebSocket(WS_URL);
    const reqId = crypto.randomUUID();
    let ready = false;
    let chatSent = false;
    let accumulated = "";
    let firstDelta = true;
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
      try { ws.close(); } catch { /* ignore */ }
      resolve();
    };

    const timeout = setTimeout(() => {
      settle(() => repo.fail(id, "Timeout: agent did not respond within 120s").catch(() => {}));
    }, 120_000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "req", id: "hs", method: "connect",
        params: {
          minProtocol: 3, maxProtocol: 3,
          auth: { token: TOKEN },
          client: { id: "gateway-client", version: "1.0", platform: "node", mode: "backend" },
          role: "operator", scopes: ["operator.admin"], caps: [], commands: [], permissions: {},
        },
      }));
    };

    ws.onmessage = async (ev) => {
      let frame: Record<string, unknown>;
      try { frame = JSON.parse(String(ev.data)) as Record<string, unknown>; }
      catch { return; }

      // Handshake response
      if (frame.id === "hs") {
        if (!frame.ok) {
          settle(() => repo.fail(id, "WS auth failed").catch(() => {}));
          return;
        }
        ready = true;

        // Send chat.send
        ws.send(JSON.stringify({
          type: "req", id: reqId, method: "chat.send",
          params: {
            message,
            sessionKey,
            deliver: false,
            idempotencyKey: crypto.randomUUID(),
          },
        }));
        return;
      }

      if (!ready) return;

      // chat.send ack
      if (frame.type === "res" && frame.id === reqId && !chatSent) {
        chatSent = true;
        if (!frame.ok) {
          console.error("[doc-job]", id, "chat.send rejected:", JSON.stringify(frame));
          const errMsg = JSON.stringify(frame.error ?? frame.payload ?? "chat.send failed");
          settle(() => repo.fail(id, errMsg).catch(() => {}));
          return;
        }
        await repo.updateStatus(id, "processing").catch(() => {});
        return;
      }

      // Chat events
      if (frame.type !== "event" || frame.event !== "chat") return;

      const payload = frame.payload as {
        sessionKey?: string;
        state: "delta" | "final" | "aborted" | "error";
        message?: { content?: Array<{ type: string; text: string }> } | null;
        errorMessage?: string;
      } | undefined;
      if (!payload || payload.sessionKey !== sessionKey) return;

      const extractText = (msg: typeof payload.message): string => {
        if (!msg || !Array.isArray(msg.content)) return "";
        return msg.content.filter(c => c.type === "text").map(c => c.text).join("");
      };

      if (payload.state === "delta") {
        const next = extractText(payload.message);
        if (next && next.length >= accumulated.length) accumulated = next;
        if (firstDelta) {
          firstDelta = false;
          await repo.appendMessage(id, {
            role: "agent",
            text: accumulated || "Generating…",
            ts: new Date().toISOString(),
          }).catch(() => {});
        }
        return;
      }

      if (payload.state === "final") {
        const text = extractText(payload.message) || accumulated;
        await repo.appendMessage(id, {
          role: "agent",
          text: text || "(no content)",
          ts: new Date().toISOString(),
        }).catch(() => {});

        settle(async () => {
          try {
            const buffer = await generateDocument(type, text, title);
            const ext = { word: "docx", excel: "xlsx", ppt: "pptx" }[type];
            const safeName = sanitizeFileName(title || "document");
            const fileName = `${safeName}.${ext}`;
            const b64 = buffer.toString("base64");
            await repo.complete(id, fileName, b64).catch(() => {});
          } catch (genErr) {
            await repo.fail(id, `Document generation failed: ${String(genErr)}`).catch(() => {});
          }
        });
        return;
      }

      if (payload.state === "error" || payload.state === "aborted") {
        settle(() =>
          repo.fail(id, payload.errorMessage ?? payload.state).catch(() => {})
        );
      }
    };

    ws.onerror = () => {
      settle(() => repo.fail(id, "WebSocket error").catch(() => {}));
    };

    ws.onclose = () => {
      if (!settled) {
        settle(() => repo.fail(id, "WebSocket closed unexpectedly").catch(() => {}));
      }
    };
  });
}

// ── Document generators ───────────────────────────────────────────────────────

async function generateDocument(type: DocJobType, text: string, title: string | null): Promise<Buffer> {
  switch (type) {
    case "word":  return generateWord(text, title);
    case "excel": return generateExcel(text, title);
    case "ppt":   return generatePpt(text, title);
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "-") || "document";
}

// ── Word ──────────────────────────────────────────────────────────────────────

function parseBoldRuns(line: string): TextRun[] {
  const parts = line.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    new TextRun({ text: part, bold: i % 2 === 1 })
  );
}

async function generateWord(text: string, _title: string | null): Promise<Buffer> {
  const lines = text.split("\n");
  const children: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("### ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(line.slice(4))] }));
    } else if (line.startsWith("## ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(line.slice(3))] }));
    } else if (line.startsWith("# ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(line.slice(2))] }));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      children.push(new Paragraph({ bullet: { level: 0 }, children: parseBoldRuns(line.slice(2)) }));
    } else if (line === "") {
      children.push(new Paragraph(""));
    } else {
      children.push(new Paragraph({ children: parseBoldRuns(line) }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}

// ── Excel ─────────────────────────────────────────────────────────────────────

async function generateExcel(text: string, title: string | null): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheetName = sanitizeFileName(title || "Sheet1").slice(0, 31);
  const sheet = workbook.addWorksheet(sheetName);

  const lines = text.split("\n");
  let headerDone = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;
    // Skip separator row (|---|---|)
    if (/^\|[\s\-|]+\|$/.test(line)) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map(c => c.trim());

    if (!headerDone) {
      const row = sheet.addRow(cells);
      row.font = { bold: true };
      headerDone = true;
    } else {
      sheet.addRow(cells);
    }
  }

  // Auto-fit columns
  sheet.columns.forEach(col => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: true }, cell => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 50);
  });

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

// ── PowerPoint ────────────────────────────────────────────────────────────────

async function generatePpt(text: string, _title: string | null): Promise<Buffer> {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";

  const slideChunks = text.split(/\n---\n/);
  let slideCount = 0;

  for (const chunk of slideChunks) {
    const lines = chunk.split("\n").map(l => l.trimEnd()).filter(l => l !== "");
    if (!lines.length) continue;

    const slide = pres.addSlide();
    slideCount++;

    // Title: first line starting with #
    const titleLine = lines.find(l => l.startsWith("# "));
    const slideTitle = titleLine ? titleLine.slice(2).trim() : "";

    if (slideTitle) {
      slide.addText(slideTitle, {
        x: 0.5, y: 0.3, w: 9, h: 1.2,
        fontSize: 28, bold: true, color: "363636",
      });
    }

    // Bullets: lines starting with - or *
    const bullets = lines
      .filter(l => l.startsWith("- ") || l.startsWith("* "))
      .map(l => ({ text: l.slice(2).trim(), options: { bullet: true, indentLevel: 0 } }));

    if (bullets.length) {
      slide.addText(bullets, {
        x: 0.5, y: 1.8, w: 9, h: 4.5,
        fontSize: 18, color: "404040",
        valign: "top",
      });
    }
  }

  if (slideCount === 0) {
    const slide = pres.addSlide();
    slide.addText(text.slice(0, 500), { x: 0.5, y: 0.5, w: 9, h: 5, fontSize: 16 });
  }

  const ab = await pres.write({ outputType: "arraybuffer" });
  return Buffer.from(ab as ArrayBuffer);
}
