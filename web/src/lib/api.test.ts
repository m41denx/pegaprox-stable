import { describe, expect, it, beforeEach } from "vitest";

import { getAuthHeaders, setSessionIdForApi } from "./api";

describe("session header helper", () => {
  beforeEach(() => {
    setSessionIdForApi(null);
  });

  it("returns empty object when no session id", () => {
    expect(getAuthHeaders()).toEqual({});
  });

  it("returns X-Session-ID when session is set", () => {
    setSessionIdForApi("abc");
    expect(getAuthHeaders()).toEqual({ "X-Session-ID": "abc" });
  });
});
