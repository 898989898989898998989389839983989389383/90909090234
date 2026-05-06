import { createApiApp } from "../lib/api-app.js";

let appPromise: ReturnType<typeof createApiApp> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = createApiApp();
    }

    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error("API initialization failed", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "API initialization failed",
    }));
  }
}
