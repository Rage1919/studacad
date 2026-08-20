export function sha256Hex(payload: string): Promise<string>;
export function verifyHmacSha256(input: {
  payload: string;
  signature: string | null;
  secret?: string;
  environmentName?: string;
}): Promise<boolean>;
