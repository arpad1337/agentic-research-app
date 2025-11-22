export default {
  appDirectory: "src/app",
  serverBuildFile: "build/server/index.mjs",
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  future: {
    v3_routeConvention: true,
  },
  browserNodeBuiltinsPolyfill: { modules: { events: true, crypto: true } },
};
