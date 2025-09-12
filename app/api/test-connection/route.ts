import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(req: NextRequest) {
  try {
    const { host, port, user, password, database, sslMode } = await req.json()
    
    if (!host || !port || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: host, port, and user are required' 
      }, { status: 400 })
    }

    const client = new Client({
      host,
      port,
      user,
      password,
      database: database || 'postgres', // Use postgres as default if not specified
      ssl: sslMode === "require" ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000, // 5 second timeout
    })

    await client.connect()
    
    // Test with a simple query
    await client.query('SELECT 1')
    
    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Connection successful!' 
    })
  } catch (error: any) {
    let errorMessage = 'Connection failed'
    let details = ''

    if (error.code) {
      switch (error.code) {
        case 'ECONNREFUSED':
          errorMessage = 'Connection refused'
          details = 'Unable to connect to the database server. Please check if the server is running and the host/port are correct.'
          break
        case 'ENOTFOUND':
          errorMessage = 'Host not found'
          details = 'The specified host could not be found. Please check the hostname.'
          break
        case 'ECONNRESET':
          errorMessage = 'Connection reset'
          details = 'The connection was reset by the server. This might be due to SSL configuration issues.'
          break
        case '28P01':
          errorMessage = 'Authentication failed'
          details = 'Invalid username or password.'
          break
        case '3D000':
          errorMessage = 'Database does not exist'
          details = 'The specified database does not exist on the server. Try connecting without specifying a database or use a different database name.'
          break
        case '28000':
          errorMessage = 'Invalid authorization'
          details = 'The user does not have permission to access this database.'
          break
        default:
          errorMessage = error.message || 'Unknown database error'
          details = error.code ? `Error code: ${error.code}` : ''
      }
    } else if (error.message) {
      errorMessage = error.message
      if (error.message.includes('timeout')) {
        details = 'Connection timed out. Please check your network connection and server availability.'
      } else if (error.message.includes('SSL')) {
        details = 'SSL connection issue. Try changing the SSL mode setting.'
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: details,
      code: error.code 
    }, { status: 500 })
  }
}