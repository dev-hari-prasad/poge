import type {
  DatabaseObject,
  TableDefinition,
  ViewDefinition,
  DatabaseDefinition,
  SchemaDefinition,
  SchemaOperation,
} from "@/types/schema"

export class MockSchemaService {
  static async getDatabaseObjects(serverId: string): Promise<DatabaseObject[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return [
      // Databases
      {
        id: `${serverId}-db-postgres`,
        name: "postgres",
        type: "database",
        serverId,
        metadata: { encoding: "UTF8", collation: "en_US.UTF-8" },
      },
      {
        id: `${serverId}-db-inventory`,
        name: "inventory",
        type: "database",
        serverId,
        metadata: { encoding: "UTF8", collation: "en_US.UTF-8" },
      },
      // Schemas for postgres database
      {
        id: `${serverId}-schema-public`,
        name: "public",
        type: "schema",
        parent: `${serverId}-db-postgres`,
        serverId,
        database: "postgres",
      },
      {
        id: `${serverId}-schema-analytics`,
        name: "analytics",
        type: "schema",
        parent: `${serverId}-db-postgres`,
        serverId,
        database: "postgres",
      },
      // Tables for public schema
      {
        id: `${serverId}-table-users`,
        name: "users",
        type: "table",
        parent: `${serverId}-schema-public`,
        serverId,
        database: "postgres",
        schema: "public",
        metadata: { rowCount: 150, size: "2.1 MB" },
      },
      {
        id: `${serverId}-table-orders`,
        name: "orders",
        type: "table",
        parent: `${serverId}-schema-public`,
        serverId,
        database: "postgres",
        schema: "public",
        metadata: { rowCount: 1250, size: "5.7 MB" },
      },
      // Views
      {
        id: `${serverId}-view-user-orders`,
        name: "user_orders_view",
        type: "view",
        parent: `${serverId}-schema-public`,
        serverId,
        database: "postgres",
        schema: "public",
      },
      // Indexes
      {
        id: `${serverId}-index-users-email`,
        name: "idx_users_email",
        type: "index",
        parent: `${serverId}-table-users`,
        serverId,
        database: "postgres",
        schema: "public",
        metadata: { columns: ["email"], isUnique: true },
      },
    ]
  }

  static async getTableDefinition(
    serverId: string,
    database: string,
    schema: string,
    table: string,
  ): Promise<TableDefinition> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Mock table definition based on table name
    const mockDefinitions: Record<string, TableDefinition> = {
      users: {
        name: "users",
        schema: "public",
        columns: [
          {
            name: "id",
            dataType: "integer",
            isNullable: false,
            isPrimaryKey: true,
            isUnique: false,
            isAutoIncrement: true,
          },
          {
            name: "username",
            dataType: "varchar",
            length: 50,
            isNullable: false,
            isPrimaryKey: false,
            isUnique: true,
            isAutoIncrement: false,
          },
          {
            name: "email",
            dataType: "varchar",
            length: 100,
            isNullable: false,
            isPrimaryKey: false,
            isUnique: true,
            isAutoIncrement: false,
          },
          {
            name: "first_name",
            dataType: "varchar",
            length: 50,
            isNullable: true,
            isPrimaryKey: false,
            isUnique: false,
            isAutoIncrement: false,
          },
          {
            name: "last_name",
            dataType: "varchar",
            length: 50,
            isNullable: true,
            isPrimaryKey: false,
            isUnique: false,
            isAutoIncrement: false,
          },
          {
            name: "created_at",
            dataType: "timestamp",
            isNullable: false,
            isPrimaryKey: false,
            isUnique: false,
            isAutoIncrement: false,
            defaultValue: "CURRENT_TIMESTAMP",
          },
        ],
        indexes: [
          {
            name: "idx_users_email",
            columns: ["email"],
            isUnique: true,
            type: "btree",
          },
          {
            name: "idx_users_username",
            columns: ["username"],
            isUnique: true,
            type: "btree",
          },
        ],
        constraints: [
          {
            name: "users_pkey",
            type: "primary_key",
            columns: ["id"],
          },
          {
            name: "users_email_unique",
            type: "unique",
            columns: ["email"],
          },
        ],
      },
      orders: {
        name: "orders",
        schema: "public",
        columns: [
          {
            name: "id",
            dataType: "integer",
            isNullable: false,
            isPrimaryKey: true,
            isUnique: false,
            isAutoIncrement: true,
          },
          {
            name: "user_id",
            dataType: "integer",
            isNullable: false,
            isPrimaryKey: false,
            isUnique: false,
            isAutoIncrement: false,
          },
          {
            name: "total_amount",
            dataType: "numeric",
            precision: 10,
            scale: 2,
            isNullable: false,
            isPrimaryKey: false,
            isUnique: false,
            isAutoIncrement: false,
          },
          {
            name: "status",
            dataType: "varchar",
            length: 20,
            isNullable: false,
            isPrimaryKey: false,
            isUnique: false,
            isAutoIncrement: false,
            defaultValue: "'pending'",
          },
          {
            name: "order_date",
            dataType: "timestamp",
            isNullable: false,
            isPrimaryKey: false,
            isUnique: false,
            isAutoIncrement: false,
            defaultValue: "CURRENT_TIMESTAMP",
          },
        ],
        indexes: [
          {
            name: "idx_orders_user_id",
            columns: ["user_id"],
            isUnique: false,
            type: "btree",
          },
          {
            name: "idx_orders_status",
            columns: ["status"],
            isUnique: false,
            type: "btree",
          },
        ],
        constraints: [
          {
            name: "orders_pkey",
            type: "primary_key",
            columns: ["id"],
          },
          {
            name: "orders_user_id_fkey",
            type: "foreign_key",
            columns: ["user_id"],
            referencedTable: "users",
            referencedColumns: ["id"],
            onUpdate: "cascade",
            onDelete: "restrict",
          },
        ],
      },
    }

    return (
      mockDefinitions[table] || {
        name: table,
        schema,
        columns: [],
        indexes: [],
        constraints: [],
      }
    )
  }

  static async createDatabase(serverId: string, definition: DatabaseDefinition): Promise<SchemaOperation> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const sql = `CREATE DATABASE "${definition.name}"
  WITH ENCODING = '${definition.encoding}'
       COLLATE = '${definition.collation}'
       TEMPLATE = ${definition.template || "template0"};`

    return {
      type: "create",
      objectType: "database",
      sql,
      description: `Create database "${definition.name}"`,
    }
  }

  static async createSchema(
    serverId: string,
    database: string,
    definition: SchemaDefinition,
  ): Promise<SchemaOperation> {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const sql = `CREATE SCHEMA "${definition.name}";`

    return {
      type: "create",
      objectType: "schema",
      sql,
      description: `Create schema "${definition.name}" in database "${database}"`,
    }
  }

  static async createTable(serverId: string, database: string, definition: TableDefinition): Promise<SchemaOperation> {
    await new Promise((resolve) => setTimeout(resolve, 800))

    let columnDefinitions = definition.columns
      .map((col) => {
        let colDef = `"${col.name}" ${col.dataType}`

        if (col.length) {
          colDef += `(${col.length})`
        } else if (col.precision && col.scale) {
          colDef += `(${col.precision},${col.scale})`
        } else if (col.precision) {
          colDef += `(${col.precision})`
        }

        if (!col.isNullable) {
          colDef += " NOT NULL"
        }

        if (col.defaultValue) {
          colDef += ` DEFAULT ${col.defaultValue}`
        }

        if (col.isAutoIncrement && col.dataType === "integer") {
          colDef = `"${col.name}" SERIAL`
          if (!col.isNullable) {
            colDef += " NOT NULL"
          }
        }

        return colDef
      })
      .join(",\n  ")

    const primaryKeyColumns = definition.columns.filter((col) => col.isPrimaryKey).map((col) => col.name)
    if (primaryKeyColumns.length > 0) {
      columnDefinitions += `,\n  PRIMARY KEY ("${primaryKeyColumns.join('", "')}")`
    }

    const sql = `CREATE TABLE "${definition.schema}"."${definition.name}" (
  ${columnDefinitions}
);`

    return {
      type: "create",
      objectType: "table",
      sql,
      description: `Create table "${definition.schema}"."${definition.name}"`,
    }
  }

  static async createView(serverId: string, database: string, definition: ViewDefinition): Promise<SchemaOperation> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const sql = `CREATE VIEW "${definition.schema}"."${definition.name}" AS
${definition.definition};`

    return {
      type: "create",
      objectType: "view",
      sql,
      description: `Create view "${definition.schema}"."${definition.name}"`,
    }
  }

  static async dropObject(
    serverId: string,
    database: string,
    objectType: string,
    objectName: string,
    cascade = false,
  ): Promise<SchemaOperation> {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const cascadeClause = cascade ? " CASCADE" : ""
    const sql = `DROP ${objectType.toUpperCase()} "${objectName}"${cascadeClause};`

    return {
      type: "drop",
      objectType: objectType as any,
      sql,
      description: `Drop ${objectType} "${objectName}"${cascade ? " (CASCADE)" : ""}`,
    }
  }

  static async generateBackupScript(
    serverId: string,
    database: string,
    includeData: boolean,
    tables?: string[],
  ): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    let script = `-- PostgreSQL database backup
-- Database: ${database}
-- Generated: ${new Date().toISOString()}

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`

    // Schema creation
    script += `-- Schema creation
CREATE SCHEMA IF NOT EXISTS public;

`

    // Table creation
    const tablesToBackup = tables || ["users", "orders", "products"]
    for (const table of tablesToBackup) {
      script += `-- Table: ${table}
CREATE TABLE public.${table} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

`

      if (includeData) {
        script += `-- Data for table: ${table}
INSERT INTO public.${table} (name) VALUES 
    ('Sample Data 1'),
    ('Sample Data 2'),
    ('Sample Data 3');

`
      }
    }

    return script
  }

  static getPostgreSQLDataTypes(): string[] {
    return [
      "bigint",
      "bigserial",
      "bit",
      "bit varying",
      "boolean",
      "box",
      "bytea",
      "character",
      "character varying",
      "cidr",
      "circle",
      "date",
      "double precision",
      "inet",
      "integer",
      "interval",
      "json",
      "jsonb",
      "line",
      "lseg",
      "macaddr",
      "money",
      "numeric",
      "path",
      "pg_lsn",
      "point",
      "polygon",
      "real",
      "smallint",
      "smallserial",
      "serial",
      "text",
      "time",
      "timestamp",
      "timestamptz",
      "timetz",
      "tsquery",
      "tsvector",
      "txid_snapshot",
      "uuid",
      "xml",
    ]
  }
}
