import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { Connect } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    // Silence the Chrome DevTools probe so React Router doesn't log a 404.
    {
      name: "suppress-chrome-devtools-probe",
      configureServer(server) {
        server.middlewares.use(
          "/.well-known/appspecific/com.chrome.devtools.json",
          (_req: Connect.IncomingMessage, res: import("http").ServerResponse) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end("{}");
          }
        );
      },
    },
  ],
});
