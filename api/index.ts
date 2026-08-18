import { createServer } from '../server';

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      cachedApp = await createServer();
    }
    // Express 5 apps are function handlers (req, res) => void
    return cachedApp(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Initialization Failure", 
        message: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined
      });
    }
  }
}
