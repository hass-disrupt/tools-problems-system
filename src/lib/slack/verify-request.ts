import * as crypto from 'crypto';

/**
 * Verifies that a request came from Slack
 */
export function verifySlackRequest(
  signingSecret: string,
  body: string,
  timestamp: string,
  signature: string
): boolean {
  // Check if timestamp is too old (replay attack protection)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false;
  }

  // Create the signature base string
  const sigBaseString = `v0:${timestamp}:${body}`;

  // Create the signature
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', signingSecret)
      .update(sigBaseString)
      .digest('hex');

  // Compare signatures using timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

