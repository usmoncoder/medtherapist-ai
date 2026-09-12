import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

// AuthForm `useSearchParams()` ni ishlatadi (?expired=1) — statik prerender
// uchun Suspense chegarasi shart, aks holda build yiqiladi.
export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
