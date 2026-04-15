import { Suspense } from "react";
import SetupWizard from "@/components/SetupWizard";

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="spinner spinner-lg" />
        </main>
      }
    >
      <SetupWizard />
    </Suspense>
  );
}
