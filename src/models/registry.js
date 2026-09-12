// Barcha modellarni bir joyda ro'yxatdan o'tkazamiz.
// Sababi: `populate()` chaqirilganda model hali import qilinmagan bo'lsa,
// Mongoose "Schema hasn't been registered" xatosini beradi. Bu fayl db.js dan
// import qilinadi va shu muammoni butunlay yopadi.
import "./User";
import "./Conversation";
import "./Message";
import "./Appointment";
import "./Analysis";
import "./Attachment";
import "./Schedule";
import "./Notification";
import "./AuditLog";
import "./PasswordResetToken";
import "./AiReport";
import "./Encounter";
import "./ClientError";
