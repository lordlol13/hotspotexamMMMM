import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";
import "./index.css";

// Use Vite env variable for backend URL (for Vercel deployment)
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL || "";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
