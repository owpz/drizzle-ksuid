import {
  generateKSUID,
  ksuidText,
  ksuidTextSqlite,
  createKsuidHelpers,
} from "../src";

describe("Index Exports", () => {
  test("exports generateKSUID function correctly", () => {
    // Suppress console.warn for this test
    const originalWarn = console.warn;
    console.warn = jest.fn();

    expect(generateKSUID).toBeDefined();
    expect(typeof generateKSUID).toBe("function");

    const ksuid = generateKSUID();
    expect(ksuid).toBeDefined();
    expect(ksuid.length).toBe(27);

    // Verify deprecation warning was shown
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("generateKSUID` is deprecated for external use")
    );

    console.warn = originalWarn;
  });

  test("exports ksuidText function correctly", () => {
    expect(ksuidText).toBeDefined();
    expect(typeof ksuidText).toBe("function");

    const column = ksuidText("id", { prefix: "usr_" });
    expect(typeof column).toBe("object");
  });

  test("exports ksuidTextSqlite function correctly", () => {
    expect(ksuidTextSqlite).toBeDefined();
    expect(typeof ksuidTextSqlite).toBe("function");

    const column = ksuidTextSqlite("id", { prefix: "usr_" });
    expect(typeof column).toBe("object");
  });

  test("exports createKsuidHelpers function correctly", () => {
    expect(createKsuidHelpers).toBeDefined();
    expect(typeof createKsuidHelpers).toBe("function");

    const helpers = createKsuidHelpers(
      { User: "usr_", Profile: "prof_" },
      "sqlite"
    );
    expect(helpers).toBeDefined();
    expect(typeof helpers.ksuid).toBe("function");
  });

  test("createKsuidHelpers supports multiple dialects", () => {
    const pgHelpers = createKsuidHelpers({ User: "usr_" }, "pg");
    expect(typeof pgHelpers.ksuid).toBe("function");

    const mysqlHelpers = createKsuidHelpers({ User: "usr_" }, "mysql");
    expect(typeof mysqlHelpers.ksuid).toBe("function");
    expect(typeof mysqlHelpers.ksuidText).toBe("function");

    const sqliteHelpers = createKsuidHelpers({ User: "usr_" }, "sqlite");
    expect(typeof sqliteHelpers.ksuid).toBe("function");
  });

  test("generateKSUID with prefix works correctly", () => {
    const originalWarn = console.warn;
    console.warn = jest.fn();

    const ksuid = generateKSUID("usr_");
    expect(ksuid).toBeDefined();
    expect(ksuid.startsWith("usr_")).toBe(true);
    expect(ksuid.length).toBe(31); // 4 char prefix + 27 char KSUID

    console.warn = originalWarn;
  });
});
