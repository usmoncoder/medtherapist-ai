import { loadPageUser } from "@/lib/pageUser";
import DoctorApp from "@/components/DoctorApp";

export default async function DoctorPage() {
  const user = await loadPageUser();
  return <DoctorApp me={user.toPublic()} />;
}
