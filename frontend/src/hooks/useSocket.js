import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Single shared socket instance
let socket = null;

function getSocket() {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
socket = io(SOCKET_URL, {
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
    bookingIds.forEach(id => {
      if (id) s.emit("join_booking", id);
    });

    // Listen for status updates
    const handler = (data) => {
      console.log("🔴 Real-time update:", data);
      cbRef.current(data);
    };
    s.on("status_update", handler);

    return () => {
      s.off("status_update", handler);
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

    s.emit("join_admin");

    const handler = (data) => {
      console.log("🔴 New booking:", data);
      cbRef.current(data);
    };
    s.on("new_booking", handler);

    return () => {
      s.off("new_booking", handler);
    };
  }, []);
}

export default getSocket;