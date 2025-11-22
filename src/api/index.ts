import dotenv from "dotenv";
import path from "path";

if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.resolve(__dirname, `../../.env`) });
}

if (!!process.env.COMPOSE) {
  dotenv.config({ path: path.resolve(__dirname, `../../.env.compose`) });
}

(async function () {
  if (!!process.env.CI) {
    await (await import("./compile-check")).main();
  } else {
    await (await import("./bootstrap")).main();
  }
})();
