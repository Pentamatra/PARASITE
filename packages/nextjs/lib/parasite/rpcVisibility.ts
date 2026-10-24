/** A broadcast hash can reach the wallet before it reaches every public RPC node. */
export function isTransactionNotVisible(error: unknown): boolean {
  let cause = error;
  for (let depth = 0; cause && typeof cause === "object" && depth < 8; depth++) {
    if ("name" in cause && cause.name === "TransactionNotFoundError") return true;
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return false;
}

export async function waitForTransactionVisibility<T>(
  read: () => Promise<T>,
  { attempts = 20, intervalMs = 750 }: { attempts?: number; intervalMs?: number } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (!isTransactionNotVisible(error) || attempt >= attempts - 1) throw error;
      await new Promise<void>(resolve => setTimeout(resolve, intervalMs));
    }
  }
}
