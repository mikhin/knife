import type { Request } from "express";

/** Express does not parse cookies, and one cookie is all this server sets. */
export const cookieFrom = (
  request: Request,
  name: string,
): string | undefined =>
  (request.header("cookie") ?? "")
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${name}=`))
    ?.slice(name.length + 1);
