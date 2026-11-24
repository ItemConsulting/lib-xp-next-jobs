import { getMultipartItem, getMultipartStream } from "/lib/xp/portal";
import type { ApplyPart } from "./apply";
import type { Request } from "@enonic-types/core";

/* ============================================================================
 * What the services for the application read from the candidate's request:
 * the file and the candidate's address. Nothing here is stored or logged.
 * ========================================================================== */

export type FileLimits = {
  maxBytes: number;
  /** With the dot, in lower case */
  extensions: string[];
};

/**
 * The uploaded file as a part to send on. Undefined when no file was chosen,
 * or "rejected" when it is outside the limits. The script checks the same
 * before sending; this is for when it didn't run
 */
export function getUploadedFile(name: string, limits: FileLimits | undefined): ApplyPart | "rejected" | undefined {
  const item = getMultipartItem(name);

  // An empty file input still sends a part, without a name and without bytes
  if (!item || !item.fileName || item.size <= 0) {
    return undefined;
  }

  // Only the name, without a path or characters that would break the header to Next
  const fileName = item.fileName.replace(/^.*[\\/]/, "").replace(/[\r\n"]/g, "");

  if (limits && (item.size > limits.maxBytes || limits.extensions.indexOf(getExtension(fileName)) === -1)) {
    return "rejected";
  }

  const stream = getMultipartStream(name);

  if (!stream) {
    return undefined;
  }

  return {
    name,
    value: stream,
    fileName,
    contentType: item.contentType || "application/octet-stream",
  };
}

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");

  return dot >= 0 ? fileName.substring(dot).toLowerCase() : "";
}

/**
 * The candidate's address as XP sees it. Next counts applications and
 * readings per address, so it must be the visitor's and not the proxy's. XP
 * takes it from X-Forwarded-For behind the proxy; see "Kandidatens adresse bak
 * proxyen" in docs/stillings-api.md
 */
export function getApplicantAddress(req: Request): string | undefined {
  const address = (req.remoteAddress ?? "").trim().replace(/^\[(.*)\]$/, "$1");

  return isIpAddress(address) ? address : undefined;
}

function isIpAddress(value: string): boolean {
  const v4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const v6 = /^[0-9a-f]{0,4}(:[0-9a-f]{0,4}){2,7}(%[\w.]+)?$|^[0-9a-f:]+:(\d{1,3}\.){3}\d{1,3}$/i;

  return v4.test(value) || v6.test(value);
}
