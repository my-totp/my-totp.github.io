# 🔐 TOTP Authenticator

A modern, offline TOTP (Time-based One-Time Password) authenticator web application built with Vue.js and Tailwind CSS. This PWA (Progressive Web App) works completely offline and can scan QR codes using your device's camera.

## ✨ Features

- 📱 **Mobile-First Design** - Optimized for mobile browsers with responsive design
- 📷 **QR Code Scanning** - Use your device's camera to scan TOTP QR codes
- 🔒 **Offline Support** - Works completely offline as a PWA
- 🔐 **AES-256 Encryption** - Optional password-based encryption for maximum security
- 💾 **Secure Storage** - Encrypted data stored locally in your browser
- ⏱️ **Real-time Codes** - Live countdown and automatic code generation
- 🎨 **Modern UI** - Beautiful interface built with Tailwind CSS
- 📋 **Copy to Clipboard** - Easy one-click code copying
- 🔄 **Auto-refresh** - Codes update automatically every 30 seconds
- 🔓 **Lock/Unlock** - Secure your accounts with password protection

## 📱 Usage

### Adding Accounts

1. **Via QR Code Scanning**
   - Click "Add Account"
   - Click "Start Camera"
   - Allow camera permissions
   - Point camera at TOTP QR code
   - Account will be added automatically

2. **Manual Entry**
   - Click "Add Account"
   - Click "Enter Manually"
   - Fill in account details:
     - Account Name (required)
     - Issuer (optional)
     - Secret Key (required - Base32 encoded)
     - Digits (6 or 8)
     - Period (15-300 seconds)

### Managing Accounts

- **Copy Code**: Click on the code or the "Copy" button
- **Delete Account**: Click the trash icon and confirm
- **View Progress**: Watch the colored progress bar for time remaining


## 🔒 Security Features

### Encryption
- **AES-256 Encryption**: All TOTP secrets are encrypted using industry-standard AES-256-GCM encryption
- **PBKDF2 Key Derivation**: Passwords are strengthened using PBKDF2 with 100,000 iterations
- **Secure Random Generation**: Cryptographically secure random values for salts and initialization vectors
- **Memory Protection**: Passwords are cleared from memory after use

### Data Protection
- All data is stored locally in your browser (never sent to external servers)
- Encrypted data is stored in localStorage with a secure format
- Automatic migration from plain text to encrypted storage
- Optional encryption disable for development or compatibility

### Security Best Practices
- Use HTTPS in production for camera access and Web Crypto API availability
- Choose strong passwords (12+ characters with mixed case, numbers, and symbols)
- Lock your accounts when not in use
- Keep your encryption password safe - it cannot be recovered if lost
- Regularly backup your accounts (export feature coming soon)

### Browser Compatibility
- Requires modern browsers with Web Crypto API support
- Graceful fallback to unencrypted storage if crypto is unavailable
- Works offline as a Progressive Web App (PWA)

## 📱 PWA Installation

### On Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Look for "Add to Home Screen" option
3. Follow the prompts to install

### On Desktop
1. Look for the install icon in your browser's address bar
2. Click to install as a desktop app

---

**Note**: This app stores sensitive authentication data locally. Please ensure you understand the security implications and keep your device secure.