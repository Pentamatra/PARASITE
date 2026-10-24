/** A disclosed uint256 threshold, not a claim about token implementation behavior. */
export const UNLIMITED_THRESHOLD = 2n ** 255n;
export const isUnlimited = (allowance: bigint) => allowance >= UNLIMITED_THRESHOLD;
export const currentExposure = (balance: bigint, allowance: bigint) => (balance < allowance ? balance : allowance);
