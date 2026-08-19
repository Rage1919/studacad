export type DatabaseEnvironment = Readonly<{
  supabaseUrl: string;
  publishableKey: string;
  secretKey: string;
  privateBucket: "studacad-private";
}>;

export class DatabaseEnvironmentError extends Error {
  readonly problems: string[];
  constructor(problems: string[]);
}

export function databaseIsRequired(environment?: NodeJS.ProcessEnv): boolean;
export function readDatabaseEnvironment(environment?: NodeJS.ProcessEnv): DatabaseEnvironment;
