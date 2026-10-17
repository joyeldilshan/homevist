import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Single shared socket instance
let socket = null;

/*
 * Socket.IO lives at the server's root, not under /api. VITE_API_URL is
 * ".../api", and passing it straight to io() made socket.io treat "/api"
 * as a namespace the server does not have: real-time updates silently
 * failed wherever VITE_API_URL was set (i.e. every deployment).
 */
export function socketOrigin(apiUrl = import.meta.env.VITE_API_URL) {
  if (!apiUrl) return "http://localhost:5000";
  try { return new URL(apiUrl).origin; } catch { return apiUrl.replace(/\/api\/?$/, ""); }
}

function getSocket() {
  if (!socket) {
    socket = io(socketOrigin(), {
      autoConnect:     false,
      reconnection:    true,
      reconnectionDelay:    1000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

/**
 * useBookingSocket(bookingIds, onStatusUpdate)
 *
 * Connects socket, joins a room for each bookingId,
 * and calls onStatusUpdate({ bookingId, status }) when
 * the server emits a "status_update" event.
 *
 * Usage:
 *   useBookingSocket(["BK001","BK002"], ({ bookingId, status }) => {
 *     console.log(bookingId, "is now", status);
 *   });
 */
export function useBookingSocket(bookingIds = [], onStatusUpdate) {
  const cbRef = useRef(onStatusUpdate);
  cbRef.current = onStatusUpdate;

  useEffect(() => {
    if (!bookingIds || bookingIds.length === 0) return;

    const s = getSocket();
    if (!s.connected) s.connect();

    // Join a room for each booking
    // Rooms do not survive a reconnect, so join on every (re)connect.
    const join = () => bookingIds.forEach(id => { if (id) s.emit("join_booking", id); });
    join();
    s.on("connect", join);

    // Listen for status updates
    const handler = (data) => {
      console.log("🔴 Real-time update:", data);
      cbRef.current(data);
    };
    s.on("status_update", handler);

    return () => {
      s.off("status_update", handler);
      s.off("connect", join);
    };
  }, [bookingIds.join(",")]);
}

/**
 * useAdminSocket(onNewBooking)
 *
 * Admin joins the admin_room and gets notified
 * whenever a patient creates a new booking.
 */
export function useAdminSocket(onNewBooking) {
  const cbRef = useRef(onNewBooking);
  cbRef.current = onNewBooking;

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    const join = () => s.emit("join_admin");
    join();
    s.on("connect", join);

    const handler = (data) => {
      console.log("🔴 New booking:", data);
      cbRef.current(data);
    };
    s.on("new_booking", handler);

    return () => {
      s.off("new_booking", handler);
      s.off("connect", join);
    };
  }, []);
}

export default getSocket;