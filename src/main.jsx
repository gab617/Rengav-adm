import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AppContextProvider } from "./contexto/Context.jsx";
import { AuthProvider } from "./contexto/AuthContext.jsx";


const userPrefs = localStorage.getItem("prefs_user"); // o usar un id fijo si no hay user
if (userPrefs) {
  const theme = JSON.parse(userPrefs).theme;
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")).render(
    <AuthProvider>
      <BrowserRouter>
        <AppContextProvider>
          <App />
        </AppContextProvider>
      </BrowserRouter>
    </AuthProvider>
);
