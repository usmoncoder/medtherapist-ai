import { loadPageUser } from "@/lib/pageUser";
import PatientApp from "@/components/PatientApp";

export default async function PatientPage() {
  const user = await loadPageUser();
  return <PatientApp me={user.toPublic()} />;
}
