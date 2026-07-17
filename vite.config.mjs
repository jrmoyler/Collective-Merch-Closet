import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Serves api/try-on.js during `vite dev` the way Vercel does in production.
function tryOnApi(env) {
  return {
    name: "collective-try-on-api",
    apply: "serve",
    configureServer(server) {
      for (const key of Object.keys(env)) {
        if (key.startsWith("OPENAI_") && !process.env[key]) process.env[key] = env[key];
      }
      server.middlewares.use("/api/try-on", async (req, res) => {
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          try {
            req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
          } catch {
            req.body = {};
          }
          const response = {
            setHeader: (name, value) => (res.setHeader(name, value), response),
            status: (code) => ((res.statusCode = code), response),
            json: (value) => {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(value));
              return response;
            },
          };
          const { default: handler } = await server.ssrLoadModule("/api/try-on.js");
          await handler(req, response);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error.message || "The fitting room hit a snag." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      allowedHosts: ["localhost"],
    },
    plugins: [react(), tryOnApi(env)],
  };
});
