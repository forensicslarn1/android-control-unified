import { describe, expect, it } from "vitest";
import { packageCommand, packageRestoreCommand } from "./packageActions";

describe("packageActions", () => {
  it("builds the three explicit User 0 commands", () => {
    expect(packageCommand("disable", "com.example.app")).toBe("pm disable-user --user 0 com.example.app");
    expect(packageCommand("uninstall", "com.example.app")).toBe("pm uninstall -k --user 0 com.example.app");
    expect(packageCommand("purge", "com.example.app")).toBe("pm uninstall --user 0 com.example.app");
  });

  it("provides a reviewable restore command and rejects shell injection", () => {
    expect(packageRestoreCommand("com.example.app")).toBe("cmd package install-existing --user 0 com.example.app");
    expect(() => packageCommand("purge", "com.example.app; reboot")).toThrow("Invalid package identifier");
  });
});
