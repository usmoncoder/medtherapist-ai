"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Avatar, Empty, FileChip, Icon } from "./ui";
import FileUploader from "./FileUploader";
import { useI18n } from "@/lib/i18n";
import { get, post } from "@/lib/api";

export default function Chat({ me, onUnreadChange }) {
  const { t, ft } = useI18n();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState([]);
  const socketRef = useRef(null);
  const bodyRef = useRef(null);
  const typingTimer = useRef(null);
  const typingSent = useRef(0);
  const activeRef = useRef(null);

  // Socket handler ichida joriy suhbatni ref orqali o'qiymiz
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const loadConversations = useCallback(async () => {
    const res = await get("/api/conversations");
    if (!res.ok) return [];
    const list = res.data.conversations || [];
    setConversations(list);
    onUnreadChange?.(list.reduce((s, c) => s + (c.unread || 0), 0));
    return list;
  }, [onUnreadChange]);

  useEffect(() => {
    loadConversations().then((list) => setActive((cur) => cur ?? list[0] ?? null));
  }, [loadConversations]);

  // Bitta socket — barcha suhbatlar uchun
  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("message:new", (m) => {
      if (activeRef.current && m.conversationId === activeRef.current.id) {
        setMessages((prev) =>
          prev.some((x) => x.id === m.id)
            ? prev
            : [...prev, { id: m.id, text: m.text, mine: m.senderId === me.id, createdAt: m.createdAt, attachments: m.attachments || [] }]
        );
      }
      loadConversations();
    });

    socket.on("typing", () => {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 1800);
    });

    return () => {
      clearTimeout(typingTimer.current);
      socket.disconnect();
    };
  }, [me.id, loadConversations]);

  // Faol suhbat almashganda xonaga qo'shilamiz
  useEffect(() => {
    if (!active) return;
    const socket = socketRef.current;
    socket?.emit("conversation:join", active.id);
    let alive = true;
    get(`/api/conversations/${active.id}/messages`).then((res) => {
      if (!alive || !res.ok) return;
      setMessages(res.data.messages || []);
      loadConversations();
    });
    return () => {
      alive = false;
      socket?.emit("conversation:leave", active.id);
    };
  }, [active, loadConversations]);

  // Faqat xabarlar konteynerini suramiz — sahifa joyida qoladi
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const value = text.trim();
    if ((!value && files.length === 0) || !active || sending) return;
    setSending(true);
    setText("");
    const sentFiles = files;
    setFiles([]);
    const res = await post(`/api/conversations/${active.id}/messages`, {
      text: value,
      attachments: sentFiles.map((f) => f.id),
    });
    setSending(false);
    if (!res.ok) {
      setText(value); // yuborilmadi — matn va fayllarni qaytaramiz
      setFiles(sentFiles);
      return;
    }
    setMessages((prev) =>
      prev.some((x) => x.id === res.data.id)
        ? prev
        : [...prev, {
            id: res.data.id, text: value, mine: true,
            createdAt: new Date().toISOString(), attachments: res.data.attachments || [],
          }]
    );
    loadConversations();
  }

  function onType(e) {
    setText(e.target.value);
    const now = Date.now();
    if (active && now - typingSent.current > 1200) {
      typingSent.current = now;
      socketRef.current?.emit("typing", { conversationId: active.id });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{t("chat.title")}</h2>
          <p>{me.role === "doctor" ? t("sub.chatDoctor") : t("sub.chatPatient")}</p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="card">
          <Empty
            icon="chat"
            title={t("chat.emptyTitle")}
            text={me.role === "doctor" ? t("chat.emptyDoctor") : t("chat.emptyPatient")}
          />
        </div>
      ) : (
        <div className="chat-layout">
          <aside className="chat-side">
            <h3>{me.role === "doctor" ? t("chat.myPatients") : t("chat.myDoctors")}</h3>
            {conversations.map((c) => (
              <button
                key={c.id}
                className={`conv-item ${active?.id === c.id ? "active" : ""}`}
                onClick={() => setActive(c)}
              >
                <Avatar name={c.peer?.fullName || "?"} size="sm" />
                <span className="c-info">
                  <strong>{c.peer?.fullName}</strong>
                  <small>{c.lastMessage?.text || t("chat.newChat")}</small>
                </span>
                {c.unread > 0 && <span className="unread-pill">{c.unread}</span>}
              </button>
            ))}
          </aside>

          <div className="chat-panel">
            <div className="chat-head">
              <Avatar name={active?.peer?.fullName || "?"} size="sm" />
              <div>
                <strong>{active?.peer?.fullName}</strong>
                <small>
                  {me.role === "doctor" ? t("chat.patient") : active?.peer?.subtitle || t("chat.doctor")}
                </small>
              </div>
            </div>

            <div className="chat-body" ref={bodyRef}>
              {messages.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: 13, margin: "auto" }}>
                  {t("chat.noMessages")}
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`bubble ${m.mine ? "mine" : "theirs"}`}>
                  {m.text}
                  {m.attachments?.length > 0 && (
                    <div className="file-chips" style={{ margin: "6px 0 0" }}>
                      {m.attachments.map((f) => <FileChip key={f.id} file={f} />)}
                    </div>
                  )}
                  <time>{ft(m.createdAt)}</time>
                </div>
              ))}
            </div>

            {typing && <div className="typing">{t("chat.typing")}</div>}

            <div className="chat-foot">
              <FileUploader context="message" files={[]} onChange={(f) => setFiles((p) => [...p, ...f])} compact />
              <input
                placeholder={t("chat.placeholder")}
                aria-label={t("chat.placeholder")}
                value={text}
                onChange={onType}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="primary-btn" onClick={send} disabled={(!text.trim() && !files.length) || sending}>
                <Icon name="send" />
                {t("chat.send")}
              </button>
            </div>

            {files.length > 0 && (
              <div className="file-chips" style={{ padding: "0 14px 12px" }}>
                {files.map((f) => (
                  <FileChip key={f.id} file={f} downloadable={false}
                    onRemove={() => setFiles((p) => p.filter((x) => x.id !== f.id))} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
