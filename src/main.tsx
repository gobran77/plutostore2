import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeCloudStorageSync, startCloudStoragePolling, syncCloudStorageNow } from "@/lib/cloudStorageSync";
import { missingFirebaseEnvKeys } from "@/integrations/firebase/client";

const bootstrap = async () => {
  const root = createRoot(document.getElementById("root")!);

  try {
    // Cloud-only mode: do not allow silent fallback to local storage.
    await initializeCloudStorageSync({ requireCloud: true });
    root.render(<App />);
    startCloudStoragePolling(3000);
    syncCloudStorageNow().catch(() => {});
  } catch (error: any) {
    console.error("Firebase bootstrap failed:", error);

    const reason = String(error?.message || "");
    const errorCode = String(error?.code || "");
    const isConfigError = reason === "firebase_not_configured";
    const details = isConfigError
      ? `Missing env vars: ${missingFirebaseEnvKeys.join(", ")}`
      : `Firestore access failed (${errorCode || "unknown"}). Check Firestore rules and browser/network blocking for firestore.googleapis.com.`;

    root.render(
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: "720px", width: "100%", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", background: "#fff" }}>
          <h1 style={{ margin: 0, marginBottom: "10px", fontSize: "22px" }}>تعذر تشغيل التطبيق بدون Firebase</h1>
          <p style={{ margin: 0, marginBottom: "8px", color: "#374151" }}>
            هذا التطبيق يعمل الآن بوضع قاعدة بيانات سحابية فقط. يجب تفعيل Firebase بشكل صحيح في Vercel.
          </p>
          <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", whiteSpace: "pre-wrap" }}>{details}</p>
        </div>
      </div>
    );
  }
};

bootstrap();
