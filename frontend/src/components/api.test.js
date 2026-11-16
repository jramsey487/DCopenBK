import { api, apiGet, invalidate, clearApiCache } from "./api";

const ok = (data) =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(data)) });
const fail = (status, data) =>
  Promise.resolve({ ok: false, status, text: () => Promise.resolve(JSON.stringify(data)) });

beforeEach(() => {
  clearApiCache();
  localStorage.setItem("token", JSON.stringify("abc"));
  global.fetch = jest.fn();
});

test("sends the auth header and JSON body", async () => {
  fetch.mockReturnValue(ok({ fine: true }));
  await api("/api/x", { method: "PATCH", body: { a: 1 } });
  const [, init] = fetch.mock.calls[0];
  expect(init.headers.Authorization).toBe("Token abc");
  expect(init.body).toBe('{"a":1}');
});

test("throws ApiError with the server's detail", async () => {
  fetch.mockReturnValue(fail(400, { detail: "Nope" }));
  await expect(api("/api/x")).rejects.toMatchObject({ status: 400, message: "Nope" });
});

test("network failure becomes status 0", async () => {
  fetch.mockRejectedValue(new TypeError("offline"));
  await expect(api("/api/x")).rejects.toMatchObject({ status: 0 });
});

test("apiGet caches within ttl and refetches after invalidate", async () => {
  fetch.mockImplementation(() => ok([1]));
  await apiGet("/api/list", { ttl: 60000 });
  await apiGet("/api/list", { ttl: 60000 });
  expect(fetch).toHaveBeenCalledTimes(1);
  invalidate("/api/list");
  await apiGet("/api/list", { ttl: 60000 });
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("concurrent GETs share one request", async () => {
  fetch.mockImplementation(() => ok([1]));
  await Promise.all([apiGet("/api/a"), apiGet("/api/a")]);
  expect(fetch).toHaveBeenCalledTimes(1);
});