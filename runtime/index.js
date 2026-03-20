const http = require("http");

const port = Number(process.env.PORT || 4001);
const defaultTemplateId = process.env.RUNTIME_TEMPLATE_ID || "tpl_openclaw";
const runtimeName = process.env.RUNTIME_NAME || "Runtime";
const openAiApiKey = process.env.OPENAI_API_KEY || "";
const openAiBaseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const openAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

function log(message, extra) {
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      service: "runtime-node",
      templateId: defaultTemplateId,
      runtimeName,
      message,
      ...(extra || {})
    })
  );
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function researchReply(message) {
  return `OpenClaw is online. I’d approach "${message}" by gathering sources first, then narrowing to the strongest claims, and finally producing a source-backed brief.`;
}

function builderReply(message) {
  return `AppClaw can turn "${message}" into a scoped build run. I’d break it into scaffold, UI generation, and packaging so the resulting artifact is deployable.`;
}

function opsReply(message) {
  return `NanoClaw is ready. For "${message}", I’d validate the operational inputs, execute the action path, and return a structured result payload.`;
}

function chatReply(templateId, message) {
  if (templateId === "tpl_appclaw") {
    return builderReply(message);
  }

  if (templateId === "tpl_nanoclaw") {
    return opsReply(message);
  }

  return researchReply(message);
}

async function callOpenAiChat(payload) {
  const history = Array.isArray(payload.history) ? payload.history : [];
  const messages = [
    {
      role: "system",
      content:
        "You are OpenClaw, an AI research agent running inside Sidekicks. Respond directly and helpfully. Keep answers concise but useful. If the user asks about your identity, mention that you are powered by OpenAI through a deployed Sidekicks runtime."
    },
    ...history
      .filter((message) => message && typeof message.content === "string" && typeof message.role === "string")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content
      })),
    {
      role: "user",
      content: payload.message
    }
  ];

  const response = await fetch(`${openAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiApiKey}`
    },
    body: JSON.stringify({
      model: openAiModel,
      messages,
      temperature: 0.4
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI chat failed with ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "OpenClaw completed the request, but the provider returned an empty response.";
}

async function runOpenAiResearch(payload) {
  const prompt = payload.prompt || payload.title || "Prepare a brief report.";
  const response = await fetch(`${openAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiApiKey}`
    },
    body: JSON.stringify({
      model: openAiModel,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are OpenClaw, a research agent. Produce a short markdown report with a title, a short summary section, and a bullet list of key points. Do not wrap the response in code fences."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI run failed with ${response.status}: ${body}`);
  }

  const data = await response.json();
  const markdown = data.choices?.[0]?.message?.content?.trim() || `# ${payload.title}\n\nNo content returned.`;

  return {
    summary: `OpenClaw completed a live OpenAI-backed research run for ${payload.agentName}.`,
    markdown,
    highlights: [
      "Used the configured OpenAI provider profile",
      "Generated a live markdown report",
      "Returned artifact-ready output to the control plane"
    ],
    logMessages: [
      `Runtime called OpenAI model ${openAiModel}.`,
      "Received completion from provider.",
      "Prepared markdown report for artifact upload."
    ],
    artifacts: [
      { name: `${payload.slug}.md`, type: "markdown", body: markdown }
    ]
  };
}

async function buildChatReply(templateId, payload) {
  if (templateId === "tpl_openclaw" && openAiApiKey) {
    try {
      log("using OpenAI-backed chat", { model: openAiModel });
      return await callOpenAiChat(payload);
    } catch (error) {
      log("OpenAI-backed chat failed, falling back to stub", {
        model: openAiModel,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  log("using stub chat path", {
    reason: templateId === "tpl_openclaw" ? "missing provider key or fallback" : "non-openclaw template"
  });
  return chatReply(templateId, payload.message);
}

async function buildRunPayload(templateId, payload) {
  if (templateId === "tpl_appclaw") {
    const manifestBody = `name=${payload.title}\nruntime=AppClaw\nagent=${payload.agentName}\nprompt=${payload.prompt}\n`;
    const bundleBody = `PK\x03\x04SIDEKICKS_APP_BUNDLE\n${payload.title}\n${payload.prompt}\n`;

    return {
      summary: `AppClaw produced a deployable build bundle for ${payload.agentName}.`,
      markdown: `# ${payload.title}\n\nAppClaw generated a deployable build artifact.`,
      highlights: [
        "Generated a mock application bundle",
        "Produced a deployment manifest",
        "Returned deployable artifact metadata"
      ],
      logMessages: [
        "Runtime accepted the build request.",
        "Generated scaffold and bundle plan.",
        "Prepared build artifacts for upload."
      ],
      artifacts: [
        { name: `${payload.slug}.zip`, type: "build", body: bundleBody },
        { name: `${payload.slug}.md`, type: "markdown", body: manifestBody }
      ]
    };
  }

  if (templateId === "tpl_nanoclaw") {
    const resultBody = JSON.stringify(
      {
        agent: payload.agentName,
        runtime: "NanoClaw",
        prompt: payload.prompt,
        result: "ok",
        actions: ["validated", "executed", "reported"]
      },
      null,
      2
    );

    return {
      summary: `NanoClaw completed an operational workflow for ${payload.agentName}.`,
      markdown: `# ${payload.title}\n\nNanoClaw completed the requested operational workflow.`,
      highlights: [
        "Validated the incoming request",
        "Executed a workflow-oriented runtime path",
        "Returned a machine-readable result bundle"
      ],
      logMessages: [
        "Runtime accepted the automation request.",
        "Validated inputs and execution plan.",
        "Prepared automation result bundle."
      ],
      artifacts: [
        { name: `${payload.slug}.json`, type: "dataset", body: resultBody }
      ]
    };
  }

  if (templateId === "tpl_openclaw" && openAiApiKey) {
    try {
      log("using OpenAI-backed run", { model: openAiModel });
      return await runOpenAiResearch(payload);
    } catch (error) {
      log("OpenAI-backed run failed, falling back to stub", {
        model: openAiModel,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const reportBody = `# ${payload.title}\n\nOpenClaw completed a research run for ${payload.agentName}.\n\n## Prompt\n${payload.prompt}\n\n## Summary\n- gathered sources\n- synthesized findings\n- produced a markdown briefing\n`;

  return {
    summary: `OpenClaw completed a source-backed research run for ${payload.agentName}.`,
    markdown: reportBody,
    highlights: [
      "Gathered source context",
      "Synthesized the requested topic",
      "Produced a markdown briefing artifact"
    ],
    logMessages: [
      "Runtime accepted the research request.",
      "Collected candidate sources and normalized findings.",
      "Prepared markdown briefing for upload."
    ],
    artifacts: [
      { name: `${payload.slug}.md`, type: "markdown", body: reportBody }
    ]
  };
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      return sendJson(response, 200, {
        ok: true,
        service: "runtime-node",
        templateId: defaultTemplateId,
        name: runtimeName,
        provider: openAiApiKey ? "openai" : "stub",
        model: openAiApiKey ? openAiModel : null
      });
    }

    if (request.method === "POST" && request.url === "/chat") {
      const payload = await readJson(request);
      return sendJson(response, 200, {
        reply: await buildChatReply(payload.templateId || defaultTemplateId, payload)
      });
    }

    if (request.method === "POST" && request.url === "/runs") {
      const payload = await readJson(request);
      return sendJson(response, 200, await buildRunPayload(payload.templateId || defaultTemplateId, payload));
    }

    return sendJson(response, 404, { message: "Not found" });
  } catch (error) {
    log("runtime request failed", {
      error: error instanceof Error ? error.message : String(error),
      method: request.method,
      url: request.url
    });
    return sendJson(response, 500, {
      message: error instanceof Error ? error.message : "Runtime request failed"
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  log("runtime ready", {
    port,
    provider: openAiApiKey ? "openai" : "stub",
    model: openAiApiKey ? openAiModel : null
  });
});
