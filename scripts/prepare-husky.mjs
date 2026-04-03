const skipHusky =
  process.env.HUSKY === "0" ||
  process.env.NODE_ENV === "production" ||
  process.env.CI === "true";

if (skipHusky) {
  process.exit(0);
}

try {
  const huskyModule = await import("husky");
  const husky = huskyModule.default;

  if (typeof husky === "function") {
    husky();
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const missingModule =
    message.includes("Cannot find package 'husky'") ||
    message.includes("ERR_MODULE_NOT_FOUND");

  if (missingModule) {
    process.exit(0);
  }

  throw error;
}
