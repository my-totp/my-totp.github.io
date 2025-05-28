/**
 * Utility functions for PWA detection and handling
 */

/**
 * Detects if the app is running in PWA mode
 * @returns {boolean} True if running as a PWA, false otherwise
 */
export function isPWAMode(): boolean {
  // Check if the app is running in standalone mode (PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }

  // Check for iOS Safari PWA mode
  if ((window.navigator as any).standalone === true) {
    return true
  }

  // Check for Android PWA mode by looking at the URL bar visibility
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return true
  }

  // Additional check for PWA mode using document.referrer
  if (document.referrer.includes('android-app://')) {
    return true
  }

  return false
}