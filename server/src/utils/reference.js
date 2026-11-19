// TODO: Implement this module.
import crypto from "node:crypto";

export function newReferences() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = crypto.randomBytes(5).toString("hex").toUpperCase();
  const reference = `BZP-${ts}-${rnd}`;
  return { reference, payoutReference: `${reference}-PO` };
}

export const REFERENCE_REGEX = /^BZP-[A-Z0-9]+-[A-F0-9]{10}$/;
