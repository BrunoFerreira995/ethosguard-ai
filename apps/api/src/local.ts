import app from "./server";
import { loadConfig } from "./config";

const config = loadConfig();
app.listen({ port: config.port, hostname: "0.0.0.0" });
console.info(`EthosGuard API listening on http://localhost:${config.port}`);
