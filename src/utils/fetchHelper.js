/**
 * fetchHelper.js - Shared utilities for data fetching logic
 */

/**
 * Creates a safety timeout for Supabase queries.
 * @param {Function} setLoading - React state setter for loading
 * @param {Function} setTimeoutError - React state setter for timeout error
 * @param {number} ms - Timeout duration in milliseconds
 * @returns {number} - The timeout ID to be cleared
 */
export const createFetchTimeout = (setLoading, setTimeoutError, ms = 10000) => {
  return setTimeout(() => {
    setLoading(prev => {
      if (prev) {
        console.warn("Fetch timed out. Forcing loading to false.");
        setTimeoutError(true);
        return false;
      }
      return prev;
    });
  }, ms);
};

/**
 * Common field selections for optimized queries
 */
export const TABLES = {
  USERS: 'id, displayname, role, email, phone, status, lastactive, uid, troupeid, appearance',
  CUSTOMERS: 'id, name, addresses, phones, notes, email, troupeid',
  INVENTORY: 'id, name, category, currentquantity, lowstockthreshold, unit, notes, lastupdated',
  TROUPES: 'id, name, vehicleplate, memberids',
  SETTINGS: 'id, baselocation, defaultduration, lioncolors, cnyoverrides, clubnameen, clubnamecn, clubregistrationno, clubaddress, clubphone, receiptpreparedby, signatoryphone, bankname, banktype, banknumber, theme',
  ITINERARIES: 'id, date, troupeid, status, totalstops, completedstops, skippedstops, totalrevenue, troupename, attendance, attendancedetails',
  STOPS: 'id, itinerary_id, order, householdname, address, phone, amount, actualamount, scheduledtime, scheduleddate, status, lionquantity, lioncolor, hasgodofwealth, hasbigheadbuddha, pluckingtype, remarks, duration, maplink, performancestartedat, completedat, paymentmethod',
  FINANCE: 'id, type, amount, category, date, description, paymentmethod, troupeid, sourcestopid, createdat'
};
