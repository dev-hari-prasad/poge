import type { QueryResult, QueryTemplate } from "@/types/query"

export class MockQueryService {
  static async executeQuery(
    serverId: string,
    database: string,
    query: string,
    signal?: AbortSignal,
  ): Promise<QueryResult[]> {
    const startTime = Date.now()

    // Simulate network delay
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, Math.random() * 1000 + 500)
      signal?.addEventListener("abort", () => {
        clearTimeout(timeout)
        reject(new Error("Query cancelled"))
      })
    })

    const executionTime = Date.now() - startTime
    const statements = query
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    const results: QueryResult[] = []

    for (const statement of statements) {
      const result = await this.executeStatement(statement, executionTime / statements.length)
      results.push(result)
    }

    return results
  }

  private static async executeStatement(statement: string, executionTime: number): Promise<QueryResult> {
    const lowerStatement = statement.toLowerCase().trim()

    // Handle different SQL statement types
    if (lowerStatement.startsWith("select")) {
      return this.handleSelectQuery(statement, executionTime)
    } else if (lowerStatement.startsWith("insert")) {
      return this.handleInsertQuery(statement, executionTime)
    } else if (lowerStatement.startsWith("update")) {
      return this.handleUpdateQuery(statement, executionTime)
    } else if (lowerStatement.startsWith("delete")) {
      return this.handleDeleteQuery(statement, executionTime)
    } else if (
      lowerStatement.startsWith("create") ||
      lowerStatement.startsWith("alter") ||
      lowerStatement.startsWith("drop")
    ) {
      return this.handleDDLQuery(statement, executionTime)
    } else {
      return {
        type: "error",
        error: `Syntax error: Unrecognized statement type`,
        executionTime,
        query: statement,
      }
    }
  }

  private static handleSelectQuery(statement: string, executionTime: number): QueryResult {
    // Mock SELECT results
    const columns = ["id", "name", "email", "created_at", "status"]
    const rowCount = Math.floor(Math.random() * 100) + 1
    const rows: Record<string, any>[] = []

    for (let i = 0; i < Math.min(rowCount, 50); i++) {
      rows.push({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: Math.random() > 0.5 ? "active" : "inactive",
      })
    }

    return {
      type: "select",
      columns,
      rows,
      rowCount,
      executionTime,
      query: statement,
    }
  }

  private static handleInsertQuery(statement: string, executionTime: number): QueryResult {
    const affectedRows = Math.floor(Math.random() * 5) + 1
    return {
      type: "insert",
      affectedRows,
      executionTime,
      query: statement,
    }
  }

  private static handleUpdateQuery(statement: string, executionTime: number): QueryResult {
    const affectedRows = Math.floor(Math.random() * 10) + 1
    return {
      type: "update",
      affectedRows,
      executionTime,
      query: statement,
    }
  }

  private static handleDeleteQuery(statement: string, executionTime: number): QueryResult {
    const affectedRows = Math.floor(Math.random() * 3) + 1
    return {
      type: "delete",
      affectedRows,
      executionTime,
      query: statement,
    }
  }

  private static handleDDLQuery(statement: string, executionTime: number): QueryResult {
    return {
      type: "success",
      executionTime,
      query: statement,
    }
  }

  static getQueryTemplates(): QueryTemplate[] {
    return [
      {
        id: "select-all",
        name: "Select All",
        description: "Select all columns from a table",
        content: "SELECT * FROM table_name;",
        category: "select",
      },
      {
        id: "select-where",
        name: "Select with WHERE",
        description: "Select with condition",
        content: "SELECT column1, column2\nFROM table_name\nWHERE condition;",
        category: "select",
      },
      {
        id: "insert-single",
        name: "Insert Single Row",
        description: "Insert a single row",
        content: "INSERT INTO table_name (column1, column2)\nVALUES (value1, value2);",
        category: "insert",
      },
      {
        id: "update-where",
        name: "Update with WHERE",
        description: "Update rows with condition",
        content: "UPDATE table_name\nSET column1 = value1\nWHERE condition;",
        category: "update",
      },
      {
        id: "delete-where",
        name: "Delete with WHERE",
        description: "Delete rows with condition",
        content: "DELETE FROM table_name\nWHERE condition;",
        category: "delete",
      },
      {
        id: "create-table",
        name: "Create Table",
        description: "Create a new table",
        content:
          "CREATE TABLE table_name (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);",
        category: "ddl",
      },
    ]
  }
}
