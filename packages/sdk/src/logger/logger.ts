import { callLogger, isLogger, type Logger } from "./app-logger.js";
import { toLogContext, type LineFields } from "./context.js";
import { DEFAULT_LOG_LEVEL, isLogLevel, rankOf, type LineLevel, type LogLevel } from "./level.js";

const LEVEL_NAMES = "debug, info, warn, error or silent";
const INVALID_LEVEL_WARNINGS: Readonly<Record<LevelSource, string>> = {
  option: `logLevel must be one of ${LEVEL_NAMES}; using ${DEFAULT_LOG_LEVEL}`,
  env: `PROBEX_LOG_LEVEL must be one of ${LEVEL_NAMES}; using ${DEFAULT_LOG_LEVEL}`,
};
const INVALID_LOGGER = "logger must be an object with debug, info, warn and error methods; using console";

/** Environment variables, as in `process.env`. */
export type Environment = Readonly<Record<string, string | undefined>>;

/** The `logger` and `logLevel` options as the app passed them; unchecked, since apps may be plain JavaScript. */
export interface LoggerOptions {
  logger?: unknown;
  logLevel?: unknown;
}

/** What `createLogger()` needs from outside. */
export interface LoggerDependencies {
  /** The component that owns the logger; it signs the warning about `PROBEX_LOG_LEVEL` before any `set()`. */
  component: string;
  env?: Environment;
  console?: Logger;
}

type LevelSource = "option" | "env";

interface ResolvedLevel {
  level: LogLevel;
  /** Where an invalid value came from; absent when the value was valid or unset. */
  invalidSource?: LevelSource;
}

// Option, then PROBEX_LOG_LEVEL, then the default (ADR 0003, ADR 0015); an empty variable counts as unset
const resolveLevel = (option: unknown, env: Environment): ResolvedLevel => {
  if (option !== undefined) {
    return isLogLevel(option) ? { level: option } : { level: DEFAULT_LOG_LEVEL, invalidSource: "option" };
  }

  const value = env.PROBEX_LOG_LEVEL;
  if (value === undefined || value === "") {
    return { level: DEFAULT_LOG_LEVEL };
  }

  return isLogLevel(value) ? { level: value } : { level: DEFAULT_LOG_LEVEL, invalidSource: "env" };
};

// A format-aware logger given a second argument would read `%s` in outside text as a placeholder and swallow the
// context into the message (ADR 0014)
const escapePercents = (text: string): string => text.replaceAll("%", "%%");

/** The SDK's own logger: filters by level, formats each line and calls the app's logger without ever throwing. */
export class SdkLogger {
  private threshold: number | undefined;
  private target: Logger;
  private passesContext = false;
  private hasReportedInvalidEnv = false;

  constructor(
    private readonly owner: string,
    private readonly env: Environment,
    private readonly defaultConsole: Logger,
  ) {
    this.target = defaultConsole;
  }

  /** Resolves `logLevel` and `logger`; a warning about an invalid one carries `component`. */
  set({ logger, logLevel }: LoggerOptions, component: string): void {
    const resolved = resolveLevel(logLevel, this.env);
    const appLogger = isLogger(logger) ? logger : undefined;
    this.threshold = rankOf(resolved.level);
    this.target = appLogger ?? this.defaultConsole;
    // A passed logger gets the context, even when it is `console` itself
    this.passesContext = appLogger !== undefined;

    this.reportInvalidLevel(resolved, component);
    if (logger !== undefined && appLogger === undefined) {
      this.log("warn", INVALID_LOGGER, { component });
    }
  }

  /** Tells whether a line at `level` would be written; ask it before building an expensive message. */
  enabled(level: LineLevel): boolean {
    return rankOf(level) >= this.currentThreshold();
  }

  /** Writes `[probex] <component>: <message>` and its context, unless `level` is below the threshold. */
  log(level: LineLevel, message: string, fields: LineFields): void {
    // Return before `fields` is read: a line below the level costs one comparison
    if (rankOf(level) < this.currentThreshold()) {
      return;
    }

    const text = `[probex] ${fields.component}: ${message}`;
    if (this.passesContext) {
      callLogger(this.target, level, [escapePercents(text), toLogContext(fields)]);
    } else {
      // The default console prints the message only, and with a single argument it prints `%%` as is
      callLogger(this.target, level, [text]);
    }
  }

  /** Writes whatever the logger holds back; lines written later are still logged. */
  flush(): void {
    // Every line is written as it comes, so there is nothing to write; callers flush on stop() and close() already
  }

  private currentThreshold(): number {
    if (this.threshold !== undefined) {
      return this.threshold;
    }

    // Read when the first line is written, not at load, so the app can still set the variable after importing
    const resolved = resolveLevel(undefined, this.env);
    this.threshold = rankOf(resolved.level);
    this.reportInvalidLevel(resolved, this.owner);
    return this.threshold;
  }

  // The environment does not change between set() calls, so its warning is written once per logger
  private reportInvalidLevel({ invalidSource }: ResolvedLevel, component: string): void {
    if (invalidSource === undefined || (invalidSource === "env" && this.hasReportedInvalidEnv)) {
      return;
    }

    this.hasReportedInvalidEnv ||= invalidSource === "env";
    this.log("warn", INVALID_LEVEL_WARNINGS[invalidSource], { component });
  }
}

/** Creates the SDK's logger; it writes to `console` at `PROBEX_LOG_LEVEL`, or `warn`, until `set()` is called. */
export const createLogger = ({
  component,
  env = process.env,
  console: defaultConsole = console,
}: LoggerDependencies): SdkLogger => new SdkLogger(component, env, defaultConsole);
