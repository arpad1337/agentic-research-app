export async function main() {
  try {
    const createApp = require("./bootstrap").createApp;
    const app = await createApp();
    console.log("Compiled:", app.ApplicationName);
    process.exit(0);
  } catch (e) {
    console.error("Compilation failed:", e);
    process.exit(1);
  }
}
