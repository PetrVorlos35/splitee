import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * `public/sw.js` není modul, ale skript běžící v ServiceWorkerGlobalScope. Načteme ho
 * jako zdroják a spustíme nad falešným scope, abychom mohli tvrdit, co dělá s jednotlivými
 * requesty — hlavně že návrat z přihlášení (`?code=`) nechá projít rovnou na server.
 */

const SW_PATH = path.join(process.cwd(), "public", "sw.js");

type SwRequest = { url: string; method: string; mode: string };
type SwEvent = { request: SwRequest; respondWith: (value: Promise<Response>) => void };
type Listener = (event: SwEvent) => void;

type Harness = {
  fetchHandler: Listener;
  fetchCalls: SwRequest[];
  cachePuts: { key: unknown; response: Response }[];
};

async function loadServiceWorker(deps: {
  onFetch?: (request: SwRequest) => Promise<Response>;
  cached?: Response;
}): Promise<Harness> {
  const source = await readFile(SW_PATH, "utf8");
  const listeners = new Map<string, Listener[]>();
  const fetchCalls: SwRequest[] = [];
  const cachePuts: { key: unknown; response: Response }[] = [];

  const cache = {
    add: async () => undefined,
    keys: async () => [],
    delete: async () => true,
    put: async (key: unknown, response: Response) => {
      cachePuts.push({ key, response });
    },
  };
  const caches = {
    open: async () => cache,
    keys: async () => [],
    delete: async () => true,
    match: async () => deps.cached,
  };
  const fakeFetch = async (request: SwRequest) => {
    fetchCalls.push(request);
    if (deps.onFetch === undefined) throw new Error("fetch selhal");
    return deps.onFetch(request);
  };
  const scope = {
    // skutečná URL, protože sw.js čte i `self.location.origin`
    location: new URL("http://localhost:3000/"),
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    skipWaiting: () => undefined,
    clients: { claim: () => undefined },
  };

  const run = new Function("self", "caches", "fetch", "Response", source);
  run(scope, caches, fakeFetch, Response);

  const fetchHandler = listeners.get("fetch")?.[0];
  if (fetchHandler === undefined) throw new Error("service worker nezaregistroval fetch handler");
  return { fetchHandler, fetchCalls, cachePuts };
}

function dispatch(harness: Harness, request: SwRequest): Promise<Response> | undefined {
  let responded: Promise<Response> | undefined;
  harness.fetchHandler({
    request,
    respondWith: (value) => {
      responded = value;
    },
  });
  return responded;
}

const navigation = (url: string): SwRequest => ({ url, method: "GET", mode: "navigate" });

test("návrat z přihlášení s ?code= service worker vůbec neobsluhuje", async () => {
  const harness = await loadServiceWorker({ onFetch: async () => new Response("z cache") });

  const responded = dispatch(harness, navigation("http://localhost:3000/?code=52901309"));

  // žádné respondWith = prohlížeč navigaci provede sám a middleware kód vymění za session
  expect(responded).toBeUndefined();
  expect(harness.fetchCalls).toEqual([]);
});

test("běžná navigace jde na síť a uloží se jako offline fallback", async () => {
  const fromNetwork = new Response("<html>stránka</html>", { status: 200 });
  const harness = await loadServiceWorker({ onFetch: async () => fromNetwork });

  const responded = dispatch(harness, navigation("http://localhost:3000/parta/abc"));

  expect(await responded).toBe(fromNetwork);
  expect(harness.fetchCalls).toHaveLength(1);
  expect(harness.cachePuts.map((put) => put.key)).toEqual(["/"]);
});

test("offline navigace dostane fallback z cache", async () => {
  const cached = new Response("<html>offline</html>", { status: 200 });
  const harness = await loadServiceWorker({ cached }); // bez onFetch => fetch selže

  const responded = dispatch(harness, navigation("http://localhost:3000/"));

  expect(await responded).toBe(cached);
});

test("přesměrování se do offline fallbacku neukládá", async () => {
  const redirect = Response.redirect("http://localhost:3000/", 307);
  const harness = await loadServiceWorker({ onFetch: async () => redirect });

  const responded = dispatch(harness, navigation("http://localhost:3000/pozvanka"));

  expect(await responded).toBe(redirect);
  expect(harness.cachePuts).toEqual([]);
});

test("statické assety zůstávají cache-first", async () => {
  const cached = new Response("chunk", { status: 200 });
  const harness = await loadServiceWorker({ cached });

  const responded = dispatch(harness, {
    url: "http://localhost:3000/_next/static/chunks/main.js",
    method: "GET",
    mode: "no-cors",
  });

  expect(await responded).toBe(cached);
  expect(harness.fetchCalls).toEqual([]);
});

test("cizí origin a jiné metody než GET se neobsluhují", async () => {
  const harness = await loadServiceWorker({ onFetch: async () => new Response("ok") });

  expect(
    dispatch(harness, navigation("https://frugal-giraffe-102.convex.site/api/auth/callback/google")),
  ).toBeUndefined();
  expect(
    dispatch(harness, { url: "http://localhost:3000/api/auth", method: "POST", mode: "cors" }),
  ).toBeUndefined();
  expect(harness.fetchCalls).toEqual([]);
});
