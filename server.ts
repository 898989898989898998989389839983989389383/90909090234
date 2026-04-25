import { createServer as createViteServer } from "vite";
import os from "os";
import path from "path";
import express from "express";
import { createApiApp } from "./lib/api-app";

async function startServer() {
  const app = await createApiApp();
  const PORT = Number(process.env.PORT ?? 3001);
  const HOST = process.env.HOST ?? (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    const interfaces = Object.values(os.networkInterfaces())
      .flat()
      .filter((details): details is NonNullable<typeof details> => Boolean(details))
      .filter((details) => details.family === "IPv4" && !details.internal)
      .map((details) => `http://${details.address}:${PORT}`);

    console.log(`Local:   http://localhost:${PORT}`);
    if (interfaces.length > 0) {
      console.log(`Network: ${interfaces[0]}`);
    }
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
