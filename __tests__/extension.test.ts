import {
  ksuidText,
  ksuidVarchar,
  ksuidTextMysql,
  ksuidTextSqlite,
  createKsuidHelpers,
} from "../src";

describe("Drizzle Extension", () => {
  test("exports ksuidText function correctly", () => {
    expect(ksuidText).toBeDefined();
    expect(typeof ksuidText).toBe("function");
  });

  test("exports ksuidVarchar function correctly", () => {
    expect(ksuidVarchar).toBeDefined();
    expect(typeof ksuidVarchar).toBe("function");
  });

  test("exports ksuidTextMysql function correctly", () => {
    expect(ksuidTextMysql).toBeDefined();
    expect(typeof ksuidTextMysql).toBe("function");
  });

  test("exports ksuidTextSqlite function correctly", () => {
    expect(ksuidTextSqlite).toBeDefined();
    expect(typeof ksuidTextSqlite).toBe("function");
  });

  test("exports createKsuidHelpers function correctly", () => {
    expect(createKsuidHelpers).toBeDefined();
    expect(typeof createKsuidHelpers).toBe("function");
  });

  test("ksuidText returns a column builder", () => {
    const column = ksuidText("id", { prefix: "usr_" });
    expect(column).toBeDefined();
    expect(typeof column).toBe("object");
  });

  test("ksuidVarchar returns a column builder with length", () => {
    const column = ksuidVarchar("id", { prefix: "usr_", length: 64 });
    expect(column).toBeDefined();
    expect(typeof column).toBe("object");
  });

  test("createKsuidHelpers creates helpers for PostgreSQL", () => {
    const helpers = createKsuidHelpers(
      { User: "usr_", Profile: "prof_" },
      "pg"
    );

    expect(helpers).toBeDefined();
    expect(helpers.ksuid).toBeDefined();
    expect(typeof helpers.ksuid).toBe("function");

    const column = helpers.ksuid("User");
    expect(column).toBeDefined();
  });

  test("createKsuidHelpers creates helpers for MySQL", () => {
    const helpers = createKsuidHelpers(
      { User: "usr_", Profile: "prof_" },
      "mysql"
    );

    expect(helpers).toBeDefined();
    expect(helpers.ksuid).toBeDefined();
    expect(helpers.ksuidText).toBeDefined();
    expect(typeof helpers.ksuid).toBe("function");
    expect(typeof helpers.ksuidText).toBe("function");
  });

  test("createKsuidHelpers creates helpers for SQLite", () => {
    const helpers = createKsuidHelpers(
      { User: "usr_", Profile: "prof_" },
      "sqlite"
    );

    expect(helpers).toBeDefined();
    expect(helpers.ksuid).toBeDefined();
    expect(typeof helpers.ksuid).toBe("function");
  });

  test("createKsuidHelpers throws error for undefined model", () => {
    const helpers = createKsuidHelpers({ User: "usr_" }, "pg");

    expect(() => {
      helpers.ksuid("NonExistentModel");
    }).toThrow('No KSUID prefix defined for model "NonExistentModel"');
  });
});
