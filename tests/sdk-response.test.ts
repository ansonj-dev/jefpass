import { createRequire } from "node:module";
import { NWCClient } from "@getalby/sdk/nwc";
import { finalizeEvent, getPublicKey, verifyEvent, type Event, type EventTemplate } from "nostr-tools";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const CommonJSClient = (require("@getalby/sdk/nwc") as { NWCClient: typeof NWCClient }).NWCClient;
const clientSecret = Uint8Array.from({ length: 32 }, () => 1);
const walletSecret = Uint8Array.from({ length: 32 }, () => 2);
const walletPubkey = getPublicKey(walletSecret);
const relay = "wss://test-transport.invalid";
const info = { methods: ["get_info", "make_invoice"], network: "regtest" };

type TestHooks = {
  _checkConnected: () => Promise<void>;
  _selectEncryptionType: () => Promise<void>;
  _encryptionType: string;
  pool: {
    publishTimeout: number;
    subscribe: (relays: string[], filter: unknown, handlers: { onevent: (event: Event) => Promise<void> }) => { close: () => void };
    publish: (relays: string[], event: Event) => Promise<unknown>[];
  };
};

function testTransport(Client: typeof NWCClient) {
  const client = new Client({ secret: Buffer.from(clientSecret).toString("hex"), walletPubkey, relayUrls: [relay] });
  const hooks = client as unknown as TestHooks;
  hooks._checkConnected = vi.fn(async () => {});
  hooks._selectEncryptionType = vi.fn(async () => {});
  hooks._encryptionType = "nip44_v2";
  client.encrypt = vi.fn(async () => "TEST TRANSPORT ONLY - NOT ENCRYPTED OR A REAL WALLET");
  client.decrypt = vi.fn(async (_pubkey, content) => content);
  client.signEvent = vi.fn(async (template: EventTemplate) => finalizeEvent(structuredClone(template), clientSecret));
  const close = vi.fn();
  let handler: (event: Event) => Promise<void>;
  let requestEvent: Event;
  let published!: () => void;
  const ready = new Promise<void>((resolve) => { published = resolve; });
  const subscribe = vi.fn((_relays: string[], _filter: unknown, handlers: { onevent: typeof handler }) => {
    handler = handlers.onevent;
    return { close };
  });
  const publish = vi.fn((_relays: string[], event: Event): Promise<unknown>[] => {
    requestEvent = event;
    published();
    return [Promise.resolve()];
  });
  hooks.pool = { publishTimeout: 5000, subscribe, publish };
  async function deliverContent(content: string) {
    const response = finalizeEvent({ kind: 23195, created_at: 1,
      tags: [["e", requestEvent.id], ["p", client.publicKey]], content }, walletSecret);
    expect(verifyEvent(response)).toBe(true);
    expect(subscribe).toHaveBeenCalledWith([relay], {
      kinds: [23195], authors: [walletPubkey], "#e": [requestEvent.id],
    }, expect.objectContaining({ onevent: expect.any(Function) }));
    await expect(handler(response)).resolves.toBeUndefined();
  }
  return { client, hooks, close, ready, publish, deliverContent,
    deliver: (response: unknown) => deliverContent(JSON.stringify(response)) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe.each([["ESM", NWCClient], ["CJS", CommonJSClient]] as const)("%s real SDK with test transport, not a real wallet", (_build, Client) => {
  it.each([
    ["null", null],
    ["array", []],
    ["primitive", "invalid"],
    ["missing result_type", { result: info }],
    ["wrong result_type", { result_type: "make_invoice", result: info }],
    ["result and truthy error", { result_type: "get_info", result: info, error: { code: "OTHER", message: "PRIVATE PROVIDER ERROR" } }],
    ["null result and truthy error", { result_type: "get_info", result: null, error: { code: "OTHER" } }],
    ["neither result nor error", { result_type: "get_info" }],
    ["falsy error without result", { result_type: "get_info", error: null }],
  ])("rejects %s without a detached callback rejection", async (_name, response) => {
    const transport = testTransport(Client);
    const rejected = expect(transport.client.getInfo()).rejects.toMatchObject({ message: "invalid NWC response envelope", code: "INTERNAL" });
    await transport.ready;
    await transport.deliver(response);
    await rejected;
    expect(transport.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([undefined, null, false])("accepts a matching result with a falsy error %s", async (error) => {
    const transport = testTransport(Client);
    const request = transport.client.getInfo();
    await transport.ready;
    await transport.deliver({ result_type: "get_info", result: info, error });
    await expect(request).resolves.toEqual(info);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resolves makeInvoice only for the matching response method", async () => {
    const transport = testTransport(Client);
    const request = transport.client.makeInvoice({ amount: 1000 });
    await transport.ready;
    await transport.deliver({ result_type: "make_invoice", result: { invoice: "TEST ONLY - NOT A REAL INVOICE" } });
    await expect(request).resolves.toEqual({ invoice: "TEST ONLY - NOT A REAL INVOICE" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects a mismatched makeInvoice response", async () => {
    const transport = testTransport(Client);
    const rejected = expect(transport.client.makeInvoice({ amount: 1000 })).rejects.toMatchObject({ message: "invalid NWC response envelope", code: "INTERNAL" });
    await transport.ready;
    await transport.deliver({ result_type: "get_info", result: { invoice: "TEST ONLY" } });
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("catches a thrown SDK result validator and rejects the request normally", async () => {
    const transport = testTransport(Client);
    const rejected = expect(transport.client.getInfo()).rejects.toBeInstanceOf(TypeError);
    await transport.ready;
    await transport.deliver({ result_type: "get_info", result: null });
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not log or include decrypted result data in validation errors", async () => {
    const transport = testTransport(Client);
    const rejected = expect(transport.client.getInfo()).rejects.toMatchObject({ message: "response from NWC failed validation" });
    await transport.ready;
    await transport.deliver({ result_type: "get_info", result: { secret: "PRIVATE DECRYPTED RESULT" } });
    await rejected;
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE");
  });

  it("preserves wallet rejection without logging provider error content", async () => {
    const transport = testTransport(Client);
    const rejected = expect(transport.client.getInfo()).rejects.toMatchObject({ code: "OTHER", message: "PRIVATE PROVIDER ERROR" });
    await transport.ready;
    await transport.deliver({ result_type: "get_info", error: { code: "OTHER", message: "PRIVATE PROVIDER ERROR" } });
    await rejected;
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["decode", "decrypt"])("rejects %s failures without leaking content", async (failure) => {
    const transport = testTransport(Client);
    if (failure === "decrypt") vi.mocked(transport.client.decrypt).mockRejectedValueOnce(new Error("PRIVATE DECRYPTION ERROR"));
    const rejected = expect(transport.client.getInfo()).rejects.toMatchObject({ message: "failed to deserialize response", code: "INTERNAL" });
    await transport.ready;
    await transport.deliverContent("not JSON");
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE");
  });

  it.each(["encrypt", "signEvent"] as const)("rejects detached request construction failures in %s", async (method) => {
    const transport = testTransport(Client);
    const failure = new Error("PRIVATE CONSTRUCTION ERROR");
    vi.mocked(transport.client[method]).mockRejectedValueOnce(failure);
    await expect(transport.client.getInfo()).rejects.toBe(failure);
    expect(transport.publish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE");
  });

  it.each(["throw", "reject"])("cleans up after publish %s", async (failure) => {
    const transport = testTransport(Client);
    transport.publish.mockImplementationOnce(() => {
      if (failure === "throw") throw new Error("PRIVATE RELAY ERROR");
      return [Promise.reject(new Error("PRIVATE RELAY ERROR"))];
    });
    await expect(transport.client.makeInvoice({ amount: 1000 })).rejects.toThrow("failed to publish:");
    expect(transport.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE");
  });

  it.each(["reply", "publish"])("clears both timers and closes the subscription on %s timeout", async (timeout) => {
    const transport = testTransport(Client);
    transport.hooks.pool.publishTimeout = timeout === "reply" ? 120000 : 100;
    transport.publish.mockImplementationOnce(() => [new Promise(() => {})]);
    const rejected = expect(transport.client.makeInvoice({ amount: 1000 })).rejects.toThrow(`${timeout} timeout:`);
    await vi.advanceTimersByTimeAsync(timeout === "reply" ? 60000 : 100);
    await rejected;
    expect(transport.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears an outstanding publish timer when a response arrives first", async () => {
    const transport = testTransport(Client);
    const publish = transport.publish.getMockImplementation()!;
    transport.publish.mockImplementationOnce((relays, event) => {
      publish(relays, event);
      return [new Promise(() => {})];
    });
    const request = transport.client.getInfo();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(2);
    await transport.deliver({ result_type: "get_info", result: info });
    await expect(request).resolves.toEqual(info);
    expect(vi.getTimerCount()).toBe(0);
  });
});