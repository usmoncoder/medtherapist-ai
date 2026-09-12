"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { get, post } from "./api";

/**
 * Xabarnomalar: bazadan yuklanadi va socket orqali real vaqtda qo'shiladi.
 * Bitta socket ulanish butun ilova uchun yetarli.
 */
export function useNotifications() {
  const [items, setItems] = useState([]);
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    const res = await get("/api/notifications");
    if (res.ok) setItems(res.data.notifications || []);
  }, []);

  useEffect(() => {
    load();
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;
    socket.on("notification:new", (n) => {
      setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 50)));
    });
    return () => socket.disconnect();
  }, [load]);

  const markRead = useCallback(async (ids) => {
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    await post("/api/notifications", { ids });
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await post("/api/notifications", { all: true });
  }, []);

  return { items, unread: items.filter((n) => !n.read).length, reload: load, markRead, markAllRead };
}
