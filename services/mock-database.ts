import type { DatabaseInfo, ColumnInfo, TableData } from "@/types/database"

// Mock data generator
const generateMockData = (columns: ColumnInfo[], rowCount: number): Record<string, any>[] => {
  const rows: Record<string, any>[] = []

  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, any> = {}

    columns.forEach((column) => {
      if (Math.random() < 0.1 && column.isNullable) {
        row[column.name] = null
        return
      }

      switch (column.dataType.toLowerCase()) {
        case "integer":
        case "bigint":
        case "smallint":
          row[column.name] = Math.floor(Math.random() * 1000) + 1
          break
        case "varchar":
        case "text":
        case "character varying":
          const names = ["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown", "Charlie Wilson"]
          const words = ["Lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit"]
          row[column.name] = column.name.includes("name")
            ? names[Math.floor(Math.random() * names.length)]
            : words.slice(0, Math.floor(Math.random() * 4) + 1).join(" ")
          break
        case "boolean":
          row[column.name] = Math.random() > 0.5
          break
        case "timestamp":
        case "timestamptz":
        case "date":
          const date = new Date()
          date.setDate(date.getDate() - Math.floor(Math.random() * 365))
          row[column.name] = date.toISOString()
          break
        case "numeric":
        case "decimal":
          row[column.name] = (Math.random() * 1000).toFixed(2)
          break
        case "uuid":
          row[column.name] = crypto.randomUUID()
          break
        default:
          row[column.name] = `Sample ${column.dataType}`
      }
    })

    rows.push(row)
  }

  return rows
}

// Mock database structure
const mockDatabases: Record<string, DatabaseInfo[]> = {
  // This will be populated based on server connections
}

export class MockDatabaseService {
  static async getDatabases(serverId: string): Promise<DatabaseInfo[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (!mockDatabases[serverId]) {
      mockDatabases[serverId] = [
        {
          name: "postgres",
          schemas: [
            {
              name: "public",
              tables: [
                {
                  name: "users",
                  type: "table",
                  schema: "public",
                  rowCount: 150,
                  columnCount: 6,
                  size: "2.1 MB",
                  createdAt: new Date("2024-01-15"),
                },
                {
                  name: "orders",
                  type: "table",
                  schema: "public",
                  rowCount: 1250,
                  columnCount: 8,
                  size: "5.7 MB",
                  createdAt: new Date("2024-01-20"),
                },
                {
                  name: "products",
                  type: "table",
                  schema: "public",
                  rowCount: 89,
                  columnCount: 5,
                  size: "1.2 MB",
                  createdAt: new Date("2024-01-10"),
                },
                {
                  name: "user_orders_view",
                  type: "view",
                  schema: "public",
                  rowCount: 1250,
                  columnCount: 10,
                },
              ],
            },
            {
              name: "analytics",
              tables: [
                {
                  name: "daily_stats",
                  type: "table",
                  schema: "analytics",
                  rowCount: 365,
                  columnCount: 12,
                  size: "3.4 MB",
                  createdAt: new Date("2024-02-01"),
                },
                {
                  name: "user_activity",
                  type: "materialized_view",
                  schema: "analytics",
                  rowCount: 5000,
                  columnCount: 8,
                },
              ],
            },
          ],
        },
        {
          name: "inventory",
          schemas: [
            {
              name: "public",
              tables: [
                {
                  name: "items",
                  type: "table",
                  schema: "public",
                  rowCount: 2500,
                  columnCount: 7,
                  size: "8.9 MB",
                  createdAt: new Date("2024-01-05"),
                },
                {
                  name: "categories",
                  type: "table",
                  schema: "public",
                  rowCount: 25,
                  columnCount: 4,
                  size: "64 KB",
                  createdAt: new Date("2024-01-05"),
                },
              ],
            },
          ],
        },
      ]
    }

    return mockDatabases[serverId]
  }

  static async getTableData(
    serverId: string,
    database: string,
    schema: string,
    table: string,
    page = 1,
    pageSize = 50,
    sortColumn?: string,
    sortDirection?: "asc" | "desc",
  ): Promise<TableData> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Get table info
    const databases = await this.getDatabases(serverId)
    const db = databases.find((d) => d.name === database)
    const schemaObj = db?.schemas.find((s) => s.name === schema)
    const tableInfo = schemaObj?.tables.find((t) => t.name === table)

    if (!tableInfo) {
      throw new Error("Table not found")
    }

    // Generate mock columns based on table name
    let columns: ColumnInfo[] = []

    switch (table) {
      case "users":
        columns = [
          { name: "id", dataType: "integer", isNullable: false, isPrimaryKey: true },
          { name: "username", dataType: "varchar(50)", isNullable: false },
          { name: "email", dataType: "varchar(100)", isNullable: false },
          { name: "first_name", dataType: "varchar(50)", isNullable: true },
          { name: "last_name", dataType: "varchar(50)", isNullable: true },
          { name: "created_at", dataType: "timestamp", isNullable: false, defaultValue: "CURRENT_TIMESTAMP" },
        ]
        break
      case "orders":
        columns = [
          { name: "id", dataType: "integer", isNullable: false, isPrimaryKey: true },
          { name: "user_id", dataType: "integer", isNullable: false },
          { name: "total_amount", dataType: "numeric(10,2)", isNullable: false },
          { name: "status", dataType: "varchar(20)", isNullable: false },
          { name: "order_date", dataType: "timestamp", isNullable: false },
          { name: "shipping_address", dataType: "text", isNullable: true },
          { name: "is_paid", dataType: "boolean", isNullable: false, defaultValue: "false" },
          { name: "notes", dataType: "text", isNullable: true },
        ]
        break
      case "products":
        columns = [
          { name: "id", dataType: "integer", isNullable: false, isPrimaryKey: true },
          { name: "name", dataType: "varchar(100)", isNullable: false },
          { name: "price", dataType: "numeric(8,2)", isNullable: false },
          { name: "description", dataType: "text", isNullable: true },
          { name: "in_stock", dataType: "boolean", isNullable: false, defaultValue: "true" },
        ]
        break
      default:
        columns = [
          { name: "id", dataType: "integer", isNullable: false, isPrimaryKey: true },
          { name: "name", dataType: "varchar(100)", isNullable: false },
          { name: "value", dataType: "text", isNullable: true },
          { name: "created_at", dataType: "timestamp", isNullable: false },
        ]
    }

    // Generate mock data
    const totalRows = tableInfo.rowCount || 100
    const allRows = generateMockData(columns, totalRows)

    // Apply sorting
    if (sortColumn && sortDirection) {
      allRows.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        if (aVal === null && bVal === null) return 0
        if (aVal === null) return sortDirection === "asc" ? -1 : 1
        if (bVal === null) return sortDirection === "asc" ? 1 : -1

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedRows = allRows.slice(startIndex, endIndex)

    return {
      columns,
      rows: paginatedRows,
      totalRows,
      currentPage: page,
      pageSize,
    }
  }
}
