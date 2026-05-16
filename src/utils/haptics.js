/**
 * Haptic feedback utility for PWAs.
 * Provides consistent vibration patterns across devices.
 */

export const Haptics = {
  /**
   * Light tap (ideal for navigation, checkbox toggles)
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium tap (ideal for button clicks, secondary actions)
   */
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  },

  /**
   * Heavy impact (ideal for primary actions, success states)
   */
  impact: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  },

  /**
   * Warning / Error pattern
   */
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  /**
   * Success double tap
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10]);
    }
  }
};
