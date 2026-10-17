/**
 * Kept so existing imports keep working. There is ONE authentication
 * implementation: middleware/auth.middleware.js.
 *
 * This file used to carry its own protect(), used by the sample and
 * report routes, which did not check isActive: a deactivated lab
 * technician or phlebotomist could keep using those routes with a token
 * issued before deactivation. Re-exporting means every route now gets the
 * same checks (valid token, user exists, account active).
 */
module.exports = require("./auth.middleware");
