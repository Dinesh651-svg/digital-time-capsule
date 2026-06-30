import path from "path";
import { pathToFileURL } from "url";

const rootServerPath = path.resolve(process.cwd(), "server", "server.js");

(async () => {
  try {
    await import(pathToFileURL(rootServerPath).href);
  } catch (error) {
    console.error("Failed to start backend server:", error);
    process.exit(1);
  }
})();

