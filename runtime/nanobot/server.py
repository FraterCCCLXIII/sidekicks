import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", "4001"))
CONFIG_PATH = os.environ.get("NANOBOT_CONFIG", "/data/nanobot/config.json")
WORKSPACE_DIR = os.environ.get("NANOBOT_WORKSPACE", "/data/nanobot/workspace")


def build_config():
    providers = {}
    default_provider = None

    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    custom_key = os.environ.get("CUSTOM_API_KEY", "").strip()
    custom_base = os.environ.get("CUSTOM_API_BASE", "").strip()

    if openrouter_key:
        providers["openrouter"] = {
            "apiKey": openrouter_key,
            "apiBase": os.environ.get("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")
        }
        default_provider = default_provider or "openrouter"

    if openai_key:
        providers["openai"] = {
            "apiKey": openai_key,
            "apiBase": os.environ.get("OPENAI_API_BASE", "https://api.openai.com/v1")
        }
        default_provider = default_provider or "openai"

    if anthropic_key:
        providers["anthropic"] = {
            "apiKey": anthropic_key,
            "apiBase": os.environ.get("ANTHROPIC_API_BASE", "https://api.anthropic.com")
        }
        default_provider = default_provider or "anthropic"

    if custom_key or custom_base:
        providers["custom"] = {
            "apiKey": custom_key,
            "apiBase": custom_base or "https://api.openai.com/v1"
        }
        default_provider = default_provider or "custom"

    provider = os.environ.get("NANOBOT_PROVIDER", "").strip() or default_provider
    model = os.environ.get("NANOBOT_MODEL", "gpt-4o-mini").strip()

    if not provider or provider not in providers:
        raise RuntimeError("No provider configured for nanobot. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY.")

    return {
        "default": {
            "provider": provider,
            "model": model
        },
        "providers": providers,
        "system": {
            "persona": os.environ.get("NANOBOT_PERSONA", "You are a helpful assistant."),
            "language": os.environ.get("NANOBOT_LANGUAGE", "en")
        }
    }


def ensure_config():
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    os.makedirs(WORKSPACE_DIR, exist_ok=True)
    config = build_config()
    with open(CONFIG_PATH, "w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=2)


def run_nanobot(prompt: str) -> str:
    ensure_config()
    command = [
        "nanobot",
        "agent",
        "-c",
        CONFIG_PATH,
        "-w",
        WORKSPACE_DIR,
        "-m",
        prompt,
        "--no-markdown"
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=90)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "nanobot exited with non-zero status")
    return (result.stdout or "").strip()


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "ok"})
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/runs":
            self._send_json(404, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8")
            payload = json.loads(raw or "{}")
        except Exception as error:
            self._send_json(400, {"error": "invalid_json", "detail": str(error)})
            return

        prompt = payload.get("prompt") or payload.get("title") or "Run a task."

        try:
            output = run_nanobot(prompt)
        except Exception as error:
            self._send_json(500, {"error": "nanobot_failed", "detail": str(error)})
            return

        markdown = f"# {payload.get('title', 'Nanobot Run')}\n\n{output}\n"
        response = {
            "summary": f"Nanobot completed a run for {payload.get('agentName', 'agent')}.",
            "highlights": [
                "Executed nanobot CLI inside the runtime container",
                "Captured the assistant response",
                "Returned a markdown artifact"
            ],
            "markdown": markdown,
            "artifacts": [
                {
                    "name": f"{payload.get('slug', 'nanobot-run')}.md",
                    "type": "markdown",
                    "body": markdown
                }
            ]
        }
        self._send_json(200, response)


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(json.dumps({"status": "starting", "port": PORT}))
    server.serve_forever()
