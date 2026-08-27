type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function emit(level: Level, scope: string, message: string, meta?: unknown) {
  const threshold = (process.env.LOG_LEVEL as Level) || "info";
  if (ORDER[level] < ORDER[threshold]) return;
  const ts = new Date().toISOString();
  const line = `[${ts}] ${level.toUpperCase().padEnd(5)} ${scope.padEnd(12)} ${message}`;
  if (level === "error") console.error(line, meta ?? "");
  else if (level === "warn") console.warn(line, meta ?? "");
  else console.log(line);
}

export const logger = {
  debug: (scope: string, msg: string, meta?: unknown) => emit("debug", scope, msg, meta),
  info: (scope: string, msg: string, meta?: unknown) => emit("info", scope, msg, meta),
  warn: (scope: string, msg: string, meta?: unknown) => emit("warn", scope, msg, meta),
  error: (scope: string, msg: string, meta?: unknown) => emit("error", scope, msg, meta),
};
