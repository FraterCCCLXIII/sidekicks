const http = require("http");

const port = Number(process.env.PORT || 4001);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { status: "ok" });
  }

  if (req.method === "POST" && req.url === "/runs") {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      let payload = {};
      try {
        payload = JSON.parse(data || "{}");
      } catch {
        return sendJson(res, 400, { error: "invalid_json" });
      }

      const title = payload.title || "NanoClaw Run";
      const message = payload.prompt || "";
      const markdown = `# ${title}\n\nNanoClaw requires an interactive Claude Code setup before it can accept automated runs.\n\n## Next steps\n- Open a terminal in the container and run \`claude\`\n- Complete \`/setup\` with your Claude credentials\n- Restart this runtime to enable automated runs\n\nPrompt received:\n${message}\n`;

      return sendJson(res, 200, {
        summary: "NanoClaw runtime is running but requires Claude Code setup.",
        highlights: [
          "Container is running",
          "Claude Code is not configured",
          "Manual setup required before automated runs"
        ],
        markdown,
        artifacts: [
          {
            name: `${payload.slug || "nanoclaw-run"}.md`,
            type: "markdown",
            body: markdown
          }
        ]
      });
    });
    return;
  }

  sendJson(res, 404, { error: "not_found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ status: "starting", port }));
});
