import { loadPageUser } from "@/lib/pageUser";
import AdminApp from "@/components/AdminApp";

export default async function AdminPage() {
  const user = await loadPageUser(["admin", "superadmin"]);
  return <AdminApp me={user.toPublic()} />;
}
