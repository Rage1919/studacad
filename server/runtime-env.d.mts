export type StudacadEnvironment = "development" | "test" | "preview" | "staging" | "production";

export type RuntimeEnvironment = Readonly<{
  name: StudacadEnvironment;
  appUrl: string;
  releaseSha: string | null;
  deployedAt: string | null;
}>;

export class RuntimeEnvironmentError extends Error {
  readonly problems: string[];
  constructor(problems: string[]);
}

export function readRuntimeEnvironment(environment?: NodeJS.ProcessEnv): RuntimeEnvironment;
