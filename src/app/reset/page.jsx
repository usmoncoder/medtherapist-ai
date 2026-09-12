import { Suspense } from "react";
import ResetForm from "@/components/ResetForm";

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
