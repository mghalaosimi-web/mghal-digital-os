export function isContentVariantSchemaUnavailable(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const candidate = error as {
    code?: unknown;
    meta?: { table?: unknown; column?: unknown; code?: unknown; message?: unknown };
  };
  const code = candidate.code;
  const meta = candidate.meta;
  if (code === "P2021" || code === "P2022") {
    const objectName = [meta?.table, meta?.column].find((value) => typeof value === "string");
    return typeof objectName === "string" && objectName.includes("ContentVariant");
  }
  if (code === "P2010" && meta?.code === "42P01") {
    return typeof meta.message === "string" && meta.message.includes("ContentVariant");
  }
  return false;
}
