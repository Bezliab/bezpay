// TODO: Implement this module.
import { monnifyRequest } from "./monnify.client.js";

const TTL = 12 * 60 * 60 * 1000;
let cache = { data: null, at: 0 };

export async function getBanks() {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  try {
    const body = await monnifyRequest({ method: "GET", url: "/api/v1/banks" });
    const list = body
      .map((b) => ({ code: String(b.code), name: b.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    cache = { data: list, at: Date.now() };
    return list;
  } catch (err) {
    if (cache.data) return cache.data; // serve stale rather than fail checkout
    throw err;
  }
}

export async function findBank(code) {
  const banks = await getBanks();
  return banks.find((b) => b.code === String(code)) || null;
}
