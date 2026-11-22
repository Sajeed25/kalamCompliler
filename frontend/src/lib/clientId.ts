import { safeGet, safeSet } from "./storage";

/** A random, anonymous id for this browser. Used only for fair rate limiting. */
export function getClientId(): string {
  let id = safeGet("kalam:clientId");
  if (!id) {
    id = crypto.randomUUID();
    safeSet("kalam:clientId", id);
  }
  return id;
}
