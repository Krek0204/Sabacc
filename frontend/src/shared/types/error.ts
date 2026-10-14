export type AppError = unknown;

export function hasApiErrorCode(error: unknown, code: string): boolean {
  if (typeof error !== 'object' || error === null || !('data' in error)) return false;
  const data = error.data;
  return typeof data === 'object' && data !== null && 'errorCode' in data && data.errorCode === code;
}
