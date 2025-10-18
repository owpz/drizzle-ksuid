import {
  ksuidText,
  ksuidVarchar,
  ksuidTextMysql,
  ksuidTextSqlite,
  createKsuidHelpers,
  pg,
  mysql,
  sqlite,
} from "../src";

describe("Coverage Tests - All Column Helpers", () => {
  describe("PostgreSQL helpers", () => {
    test("ksuidText creates column with prefix", () => {
      const column = ksuidText("id", { prefix: "usr_" });
      expect(column).toBeDefined();
      expect(typeof column).toBe("object");
    });

    test("ksuidText creates column without prefix", () => {
      const column = ksuidText("id");
      expect(column).toBeDefined();
    });

    test("pg.ksuidText creates column", () => {
      const column = pg.ksuidText("id", { prefix: "usr_" });
      expect(column).toBeDefined();
    });
  });

  describe("MySQL helpers", () => {
    test("ksuidVarchar creates column with prefix and length", () => {
      const column = ksuidVarchar("id", { prefix: "usr_", length: 128 });
      expect(column).toBeDefined();
      expect(typeof column).toBe("object");
    });

    test("ksuidVarchar creates column with default length", () => {
      const column = ksuidVarchar("id", { prefix: "usr_" });
      expect(column).toBeDefined();
    });

    test("ksuidVarchar creates column without options", () => {
      const column = ksuidVarchar("id");
      expect(column).toBeDefined();
    });

    test("ksuidTextMysql creates column with prefix", () => {
      const column = ksuidTextMysql("id", { prefix: "usr_" });
      expect(column).toBeDefined();
      expect(typeof column).toBe("object");
    });

    test("ksuidTextMysql creates column without prefix", () => {
      const column = ksuidTextMysql("id");
      expect(column).toBeDefined();
    });

    test("mysql.ksuidVarchar creates column", () => {
      const column = mysql.ksuidVarchar("id", { prefix: "usr_" });
      expect(column).toBeDefined();
    });

    test("mysql.ksuidText creates column", () => {
      const column = mysql.ksuidText("id", { prefix: "usr_" });
      expect(column).toBeDefined();
    });
  });

  describe("SQLite helpers", () => {
    test("ksuidTextSqlite creates column with prefix", () => {
      const column = ksuidTextSqlite("id", { prefix: "usr_" });
      expect(column).toBeDefined();
      expect(typeof column).toBe("object");
    });

    test("ksuidTextSqlite creates column without prefix", () => {
      const column = ksuidTextSqlite("id");
      expect(column).toBeDefined();
    });

    test("sqlite.ksuidText creates column", () => {
      const column = sqlite.ksuidText("id", { prefix: "usr_" });
      expect(column).toBeDefined();
    });
  });

  describe("createKsuidHelpers with PostgreSQL", () => {
    test("creates helpers for PostgreSQL dialect", () => {
      const helpers = createKsuidHelpers({ User: "usr_", Post: "post_" }, "pg");
      expect(helpers.ksuid).toBeDefined();
      expect(typeof helpers.ksuid).toBe("function");
    });

    test("PostgreSQL helper creates column with default column name", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "pg");
      const column = helpers.ksuid("User");
      expect(column).toBeDefined();
    });

    test("PostgreSQL helper creates column with custom column name", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "pg");
      const column = helpers.ksuid("User", "custom_id");
      expect(column).toBeDefined();
    });
  });

  describe("createKsuidHelpers with MySQL", () => {
    test("creates helpers for MySQL dialect", () => {
      const helpers = createKsuidHelpers(
        { User: "usr_", Post: "post_" },
        "mysql"
      );
      expect(helpers.ksuid).toBeDefined();
      expect(helpers.ksuidText).toBeDefined();
      expect(typeof helpers.ksuid).toBe("function");
      expect(typeof helpers.ksuidText).toBe("function");
    });

    test("MySQL varchar helper creates column with default params", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "mysql");
      const column = helpers.ksuid("User");
      expect(column).toBeDefined();
    });

    test("MySQL varchar helper creates column with custom column name", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "mysql");
      const column = helpers.ksuid("User", "custom_id");
      expect(column).toBeDefined();
    });

    test("MySQL varchar helper creates column with custom length", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "mysql");
      const column = helpers.ksuid("User", "id", 256);
      expect(column).toBeDefined();
    });

    test("MySQL text helper creates column with default column name", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "mysql") as ReturnType<typeof createKsuidHelpers> & { ksuidText: (modelName: string, columnName?: string) => any };
      const column = helpers.ksuidText("User");
      expect(column).toBeDefined();
    });

    test("MySQL text helper creates column with custom column name", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "mysql") as ReturnType<typeof createKsuidHelpers> & { ksuidText: (modelName: string, columnName?: string) => any };
      const column = helpers.ksuidText("User", "custom_id");
      expect(column).toBeDefined();
    });
  });

  describe("createKsuidHelpers with SQLite", () => {
    test("creates helpers for SQLite dialect", () => {
      const helpers = createKsuidHelpers(
        { User: "usr_", Post: "post_" },
        "sqlite"
      );
      expect(helpers.ksuid).toBeDefined();
      expect(typeof helpers.ksuid).toBe("function");
    });

    test("SQLite helper creates column with default column name", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "sqlite");
      const column = helpers.ksuid("User");
      expect(column).toBeDefined();
    });

    test("SQLite helper creates column with custom column name", () => {
      const helpers = createKsuidHelpers({ User: "usr_" }, "sqlite");
      const column = helpers.ksuid("User", "custom_id");
      expect(column).toBeDefined();
    });
  });

  describe("createKsuidHelpers default dialect", () => {
    test("defaults to PostgreSQL when no dialect specified", () => {
      const helpers = createKsuidHelpers({ User: "usr_" });
      expect(helpers.ksuid).toBeDefined();
      const column = helpers.ksuid("User");
      expect(column).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    test("handles empty prefix string", () => {
      const column = ksuidText("id", { prefix: "" });
      expect(column).toBeDefined();
    });

    test("handles special characters in prefix", () => {
      const column = ksuidText("id", { prefix: "user-test_123_" });
      expect(column).toBeDefined();
    });

    test("handles very long prefix", () => {
      const longPrefix = "a".repeat(100) + "_";
      const column = ksuidText("id", { prefix: longPrefix });
      expect(column).toBeDefined();
    });
  });
});
