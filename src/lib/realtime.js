// server.js Socket.io serverni global'ga yozadi, API route'lar shu orqali xabar yuboradi
export function emitToConversation(conversationId, event, payload) {
  global._io?.to(`conv:${conversationId}`).emit(event, payload);
}

// Har bir foydalanuvchi o'z shaxsiy xonasida — xabarnomalar shu orqali yetadi
export function emitToUser(userId, event, payload) {
  global._io?.to(`user:${String(userId)}`).emit(event, payload);
}

export function emitToRole(role, event, payload) {
  global._io?.to(`role:${role}`).emit(event, payload);
}
