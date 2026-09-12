import AuditLog from "@/models/AuditLog";
import { ApiError } from "@/lib/errors";
import { route } from "@/lib/http";
import { audit, ACTIONS } from "@/lib/audit";

// Audit jurnali. Admin ko'radi, bosh administrator hammasini ko'radi.
const ADMIN_HIDDEN = ["role_change", "user_deactivate", "2fa_disable"];

export const GET = route(
  async ({ req, session }) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format");
    const action = url.searchParams.get("action");
    const actor = url.searchParams.get("actor");
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = format === "csv" ? 5000 : Math.min(200, Number(url.searchParams.get("limit") || 60));

    const filter = {};
    if (action && action !== "all") filter.action = action;
    if (actor) filter.actor = actor;
    if (session.role !== "superadmin") filter.action = filter.action || { $nin: ADMIN_HIDDEN };

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    // CSV eksport — faqat bosh administrator
    if (format === "csv") {
      if (session.role !== "superadmin") throw new ApiError("ROLE_NOT_ALLOWED");
      await audit(session, ACTIONS.AUDIT_EXPORT, { meta: { total, action: action || "all" } }, req);
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = [
        ["sana", "kim", "rol", "amal", "obyekt", "nomi", "ip"].join(","),
        ...logs.map((l) =>
          [l.createdAt.toISOString(), l.actorName, l.actorRole, l.action,
           l.targetType || "", l.targetName || "", l.ip || ""].map(esc).join(",")
        ),
      ].join("\n");
      return new Response("\uFEFF" + rows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      logs: logs.map((l) => ({
        id: l._id.toString(),
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        targetType: l.targetType || "",
        targetName: l.targetName || "",
        meta: l.meta || null,
        ip: session.role === "superadmin" ? l.ip : undefined,
        createdAt: l.createdAt,
      })),
    };
  },
  { role: ["admin", "superadmin"] }
);
