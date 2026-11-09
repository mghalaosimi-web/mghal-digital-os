import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const apiRoot = path.join(process.cwd(), "src", "app", "api");
const intentionallyPublic = new Set([
  "health/route.ts",
  "ready/route.ts",
  // Login/session lifecycle uses same-origin checks and a dedicated Redis limiter.
  "auth/session/route.ts",
  // Legacy bootstrap proxy has a strict origin allowlist and delegates token checks upstream.
  "mghal/admin/[...segments]/route.ts",
]);

async function collectRouteFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? path.join(prefix, entry.name) : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectRouteFiles(absolute, relative));
    } else if (entry.isFile() && entry.name === "route.ts") {
      files.push(relative.split(path.sep).join("/"));
    }
  }
  return files;
}

test("every API route is protected or explicitly classified as public", async () => {
  const routes = await collectRouteFiles(apiRoot);
  assert.ok(routes.length > 0, "API route inventory must not be empty");

  for (const route of routes) {
    const source = await readFile(path.join(apiRoot, route), "utf8");
    if (intentionallyPublic.has(route)) {
      if (route === "auth/session/route.ts") {
        assert.match(source, /isSameOrigin\(request\)/, route);
        assert.match(source, /checkLoginRateLimit\(request\)/, route);
      } else if (route === "mghal/admin/[...segments]/route.ts") {
        assert.match(source, /validOrigin\(request\)/, route);
        assert.match(source, /validReadOrigin\(request\)/, route);
      }
      continue;
    }

    assert.match(source, /import\s+\{\s*requireOwnerApi\s*\}\s+from\s+["']@\/lib\/api-auth["']/, route);
    assert.match(source, /requireOwnerApi\(request\)/, route);
  }

  for (const route of intentionallyPublic) {
    assert.ok(routes.includes(route), `public-route exception no longer exists: ${route}`);
  }
});

test("protected API handlers authenticate before parsing request bodies or accessing Prisma", async () => {
  const routes = await collectRouteFiles(apiRoot);
  for (const route of routes.filter((item) => !intentionallyPublic.has(item))) {
    const source = await readFile(path.join(apiRoot, route), "utf8");
    const guard = source.indexOf("requireOwnerApi(request)");
    assert.notEqual(guard, -1, route);

    for (const operation of ["request.json()", "request.text()", "prisma."]) {
      const position = source.indexOf(operation);
      if (position !== -1) {
        assert.ok(guard < position, `${route}: ${operation} appears before owner authorization`);
      }
    }
  }
});
