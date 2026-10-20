import { describe, it, expect } from "vitest";
import { socketOrigin } from "./useSocket";

describe("socketOrigin", () => {
  it("strips the /api path so socket.io connects to the root namespace", () => {
    expect(socketOrigin("https://api.example.com/api")).toBe("https://api.example.com");
    expect(socketOrigin("http://localhost:5000/api/")).toBe("http://localhost:5000");
  });
  it("defaults to the local backend", () => {
    expect(socketOrigin("")).toBe("http://localhost:5000");
    expect(socketOrigin(undefined)).toBe("http://localhost:5000");
  });
});
