// Port the generated static preview server listens on inside the sandbox
// workspace. Kept separate from the adapter so any SandboxAdapter can serve
// the same self-contained script.
export const PREVIEW_PORT = 3000;

export const STATIC_SERVER_FILE = "launchblitz-preview-server.mjs";

// Dependency-free Node http server: no `npm install` runs inside the sandbox,
// so the script must work with only Node's standard library.
export const STATIC_SERVER_SCRIPT = `import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = ${PREVIEW_PORT};
const ROOT = import.meta.dirname;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalized = normalize(requestedPath);

  if (normalized.includes("..")) {
    res.writeHead(404).end("Not found");
    return;
  }

  try {
    const filePath = join(ROOT, normalized);
    const contents = await readFile(filePath);
    const contentType = CONTENT_TYPES[extname(filePath)] ?? "text/plain; charset=utf-8";
    res.writeHead(200, { "Content-Type": contentType }).end(contents);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT);
`;

export const STATIC_SERVER_COMMAND = `node ${STATIC_SERVER_FILE}`;
