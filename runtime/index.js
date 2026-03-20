const http = require("http");

const port = Number(process.env.PORT || 4001);

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

function runPayload(templateId, payload) {
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
  if (request.method === "GET" && request.url === "/health") {
    return sendJson(response, 200, { ok: true, service: "runtime-node" });
  }

  if (request.method === "POST" && request.url === "/chat") {
    const payload = await readJson(request);
    return sendJson(response, 200, {
      reply: chatReply(payload.templateId, payload.message)
    });
  }

  if (request.method === "POST" && request.url === "/runs") {
    const payload = await readJson(request);
    return sendJson(response, 200, runPayload(payload.templateId, payload));
  }

  return sendJson(response, 404, { message: "Not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ service: "runtime-node", message: "runtime ready", port }));
});
