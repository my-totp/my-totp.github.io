// TOTP Account interface
export interface TOTPAccount {
  id: string
  secret: string
  label: string
  issuer?: string
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512'
  digits?: number
  period?: number
  addedAt: number
}

// Modal mode type
export type ModalMode = 'scanner' | 'manual'
