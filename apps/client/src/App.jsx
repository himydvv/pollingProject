import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { PollRoomPage } from "./pages/PollRoomPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/poll/:pollId" element={<PollRoomPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
}

