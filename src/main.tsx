import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeCloudStorageSync } from "@/lib/cloudStorageSync";

const bootstrap = async () => {
  await initializeCloudStorageSync();
  createRoot(document.getElementById("root")!).render(<App />);
};

bootstrap();
