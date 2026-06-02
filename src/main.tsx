import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DesignFoundationPreview } from "@/dev/DesignFoundationPreview";
import "./index.css";

const Root =
  import.meta.env.VITE_DESIGN_PREVIEW === "true"
    ? DesignFoundationPreview
    : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
