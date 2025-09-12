// Encryption utilities using Web Crypto API
export class EncryptionService {
  private static readonly ALGORITHM = "AES-GCM"
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly SALT_LENGTH = 16
  private static readonly ITERATIONS = 100000

  // Derive key from PIN using PBKDF2
  static async deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const pinBuffer = encoder.encode(pin)

    const baseKey = await crypto.subtle.importKey("raw", pinBuffer, "PBKDF2", false, ["deriveKey"])

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: this.ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false,
      ["encrypt", "decrypt"],
    )
  }

  // Generate random salt
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
  }

  // Generate random IV
  static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
  }

  // Encrypt data
  static async encrypt(data: string, pin: string): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)

      const salt = this.generateSalt()
      const iv = this.generateIV()
      const key = await this.deriveKey(pin, salt)

      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        dataBuffer,
      )

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength)
      combined.set(salt, 0)
      combined.set(iv, salt.length)
      combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length)

      // Convert to base64
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error("Encryption failed:", error)
      throw new Error("Failed to encrypt data")
    }
  }

  // Decrypt data
  static async decrypt(encryptedData: string, pin: string): Promise<string> {
    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((char) => char.charCodeAt(0)),
      )

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, this.SALT_LENGTH)
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH)
      const encryptedBuffer = combined.slice(this.SALT_LENGTH + this.IV_LENGTH)

      const key = await this.deriveKey(pin, salt)

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encryptedBuffer,
      )

      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    } catch (error) {
      console.error("Decryption failed:", error)
      throw new Error("Failed to decrypt data - invalid PIN or corrupted data")
    }
  }

  // Generate secure random PIN
  static generateSecurePin(): string {
    const digits = crypto.getRandomValues(new Uint8Array(6))
    return Array.from(digits, (byte) => (byte % 10).toString()).join("")
  }

  // Hash PIN for verification (never store plain PIN)
  static async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(pin)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = new Uint8Array(hashBuffer)
    return btoa(String.fromCharCode(...hashArray))
  }

  // Verify PIN against hash
  static async verifyPin(pin: string, hash: string): Promise<boolean> {
    try {
      const pinHash = await this.hashPin(pin)
      return pinHash === hash
    } catch (error) {
      return false
    }
  }
}

export default EncryptionService
