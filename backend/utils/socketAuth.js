/**
 * Real-time rooms. The socket server used to accept anyone: no sign-in,
 * "join_booking" joined whatever booking ID was sent (a patient could
 * listen to another patient's status updates) and "join_admin" put any
 * visitor in the admin room, which hears every new booking.
 *
 * Now:
 *   - connecting needs the same JWT as the API (socket auth.token), for an
 *     existing, active account;
 *   - join_booking: the patient who owns the booking, the phlebotomist
 *     assigned to it, or an admin;
 *   - join_admin: admins only.
 * A refused join is silently ignored, like a booking ID that does not
 * exist, so nothing is revealed about other people's bookings.
 *
 * Limit: a socket keeps the identity it connected with; an account
 * deactivated while connected stays in its rooms until it disconnects.
 */
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const Booking = require("../models/Booking");
const logger  = require("./logger");

const refuse = () => new Error("Not authorised.");

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) return next(refuse());
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select("role isActive").lean();
    if (!user || !user.isActive) return next(refuse());
    socket.data.user = { _id: String(user._id), role: user.role };
    next();
  } catch {
    next(refuse());
  }
}

async function canJoinBooking(user, bookingId) {
  if (!user || typeof bookingId !== "string" || !bookingId || bookingId.length > 64) return false;
  const booking = await Booking.findOne({ bookingId }).select("user phlebotomist").lean();
  if (!booking) return false;
  if (user.role === "admin")        return true;
  if (user.role === "user")         return String(booking.user) === user._id;
  if (user.role === "phlebotomist") return String(booking.phlebotomist) === user._id;
  return false;
}

function registerSocketHandlers(io) {
  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    const user = socket.data.user;
    logger.debug("Socket connected:", socket.id);
    socket.on("join_booking", async (bookingId) => {
      try { if (await canJoinBooking(user, bookingId)) socket.join(bookingId); }
      catch (e) { logger.error("Socket join error:", e.message); }
    });
    socket.on("join_admin", () => { if (user.role === "admin") socket.join("admin_room"); });
    socket.on("disconnect", () => logger.debug("Socket disconnected:", socket.id));
  });
}

module.exports = { authenticateSocket, canJoinBooking, registerSocketHandlers };
