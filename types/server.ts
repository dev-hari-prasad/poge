export interface ServerConnection {
  id: string
  name: string
  host: string
  port: number
  database: string
  username: string
  password: string
  sslMode?: "disable" | "require" | "prefer"
  connected: boolean
  favorite?: boolean
  createdAt: Date
  lastConnected?: Date
}

export interface ServerFormData {
  name: string
  host: string
  port: number
  database: string
  username: string
  password: string
  sslMode?: "disable" | "require" | "prefer"
  connectionString?: string
}
