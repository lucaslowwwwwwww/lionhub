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
  USERS: 'id, uid, displayname, email, phone, role, status, troupeid, lastactive, createdat, updatedat, deletedat, appearance, org_id, is_super_admin',
  CUSTOMERS: 'id, name, addresses, phones, notes, email, troupeid, org_id',
  INVENTORY: 'id, name, category, currentquantity, lowstockthreshold, unit, notes, lastupdated, org_id',
  TROUPES: 'id, name, vehicleplate, memberids, org_id',
  SETTINGS: '*',
  ITINERARIES: 'id, date, troupeid, status, totalstops, completedstops, skippedstops, totalrevenue, troupename, attendance, attendancedetails, org_id',
  ITINERARIES_LIGHT: 'id, date, troupeid, status, totalstops, completedstops, skippedstops, totalrevenue, troupename, attendance, org_id',
  STOPS: 'id, itinerary_id, order, householdname, address, phone, amount, actualamount, scheduledtime, scheduleddate, status, lionquantity, lioncolor, hasgodofwealth, hasbigheadbuddha, extra_characters, pluckingtype, remarks, duration, maplink, performancestartedat, completedat, paymentmethod, org_id',
  FINANCE: 'id, type, amount, category, date, description, paymentmethod, troupeid, sourcestopid, createdat, org_id'
};
