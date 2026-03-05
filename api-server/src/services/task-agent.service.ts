import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { addComment } from "./task-comments.service";
import { uploadFile } from "./task-files.service";
import * as taskRepo from "../repositories/task.repository";
import { SKILL_TASK_API, SKILL_WORD, extractSkillBody } from "../lib/skills-content";
import type { MyTask, TaskComment } from "@ajb/contract";

const WS_URL = process.env.OPENCLAW_WS_URL ?? "ws://openclaw:18789";
const TOKEN  = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";

export function dispatchTaskToAgent(
  task: MyTask,
  comments: TaskComment[],
  agentId: string,
  agentName: string,
  trigger: "assignment" | "update" | "comment" = "assignment",
): Promise<void> {
  const sessionKey = `agent:${agentId}:task-${task.id}`;

  const commentBlock = comments.length
    ? comments.map(c => `${c.authorName}: ${c.content}`).join("\n")
    : "(none)";

  const taskSkill = extractSkillBody(SKILL_TASK_API);

  const isDocumentTask = /\b(docx|word|document|novel|report|essay|article|story|书|文|小说|报告|文件)\b/i
    .test(task.title + " " + (task.description ?? ""));

  const parts = [
    `[Trigger: ${trigger}] You have been assigned a task in AJB:`,
    "",
    `**Title:** ${task.title}`,
    `**Task ID:** ${task.id}`,
    `**Priority:** ${task.priority}`,
    `**Status:** ${task.status}`,
    `**Due Date:** ${task.dueDate ?? "Not set"}`,
    `**Description:** ${task.description ?? "No description provided"}`,
    `**Tags:** ${task.tags?.length ? task.tags.join(", ") : "None"}`,
    "",
    "**Existing Comments:**",
    commentBlock,
    "",
    "---",
    "[AJB Task Agent Skill]",
    "",
    taskSkill,
  ];

  if (isDocumentTask) {
    parts.push("", "---", "[Document Skill: create-word-document]", "", extractSkillBody(SKILL_WORD));
  }

  parts.push("", "---", "Begin now. Follow the mandatory sequence above.");

  const message = parts.join("\n");

  return new Promise<void>((resolve) => {
    const ws = new WebSocket(WS_URL);
    const reqId = crypto.randomUUID();
    let ready = false;
    let chatSent = false;
    let accumulated = "";
    let settled = false;

    const settle = (fn: () => Promise<void> | void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      Promise.resolve(fn()).catch(() => {}).finally(() => {
        try { ws.close(); } catch { /* ignore */ }
        resolve();
      });
    };

    const timeout = setTimeout(() => {
      settle(() =>
        addComment(task.id, {
          content: "Agent did not respond within 120s.",
          authorType: "agent",
          authorId: agentId,
          authorName: agentName,
        }).catch(() => {})
      );
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
          settle(() =>
            addComment(task.id, {
              content: "Agent connection failed: WS auth failed.",
              authorType: "agent",
              authorId: agentId,
              authorName: agentName,
            }).catch(() => {})
          );
          return;
        }
        ready = true;

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
          console.error("[task-agent]", task.id, "chat.send rejected:", JSON.stringify(frame));
          const errMsg = JSON.stringify(frame.error ?? frame.payload ?? "chat.send failed");
          settle(() =>
            addComment(task.id, {
              content: `Agent dispatch failed: ${errMsg}`,
              authorType: "agent",
              authorId: agentId,
              authorName: agentName,
            }).catch(() => {})
          );
          return;
        }
        // Dispatch accepted — mark task in-progress
        await taskRepo.update(task.id, { status: "in-progress" }).catch(() => {});
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
        return;
      }

      if (payload.state === "final") {
        const finalText = extractText(payload.message) || accumulated;

        settle(async () => {
          // Post agent response as comment
          await addComment(task.id, {
            content: finalText || "(no content)",
            authorType: "agent",
            authorId: agentId,
            authorName: agentName,
          }).catch(() => {});

          // Generate .docx if agent replied with structured document content
          if (isDocumentTask && finalText.length > 200 && /^#{1,3} /m.test(finalText)) {
            try {
              const buffer = await generateWord(finalText);
              const fileName = `task-${task.id.slice(0, 8)}-response.docx`;
              await uploadFile(task.id, {
                fileName,
                fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                fileDataB64: buffer.toString("base64"),
                uploadedBy: agentId,
                uploadedByName: agentName,
              }).catch(() => {});
            } catch (err) {
              console.error("[task-agent] docx generation failed:", err);
            }
          }

          // Mark task done
          await taskRepo.update(task.id, { status: "done" }).catch(() => {});
        });
        return;
      }

      if (payload.state === "error" || payload.state === "aborted") {
        settle(() =>
          addComment(task.id, {
            content: `Agent response ${payload.state}: ${payload.errorMessage ?? payload.state}`,
            authorType: "agent",
            authorId: agentId,
            authorName: agentName,
          }).catch(() => {})
        );
      }
    };

    ws.onerror = () => {
      settle(() =>
        addComment(task.id, {
          content: "Agent dispatch failed: WebSocket error.",
          authorType: "agent",
          authorId: agentId,
          authorName: agentName,
        }).catch(() => {})
      );
    };

    ws.onclose = () => {
      if (!settled) {
        settle(() =>
          addComment(task.id, {
            content: "Agent dispatch failed: WebSocket closed unexpectedly.",
            authorType: "agent",
            authorId: agentId,
            authorName: agentName,
          }).catch(() => {})
        );
      }
    };
  });
}

// ── Word generation ────────────────────────────────────────────────────────────

function parseBoldRuns(line: string): TextRun[] {
  const parts = line.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    new TextRun({ text: part, bold: i % 2 === 1 })
  );
}

async function generateWord(text: string): Promise<Buffer> {
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
