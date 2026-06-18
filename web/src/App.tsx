// Korzeń aplikacji: bramka klucza → router z dolnymi zakładkami (Dziś / Zadania / Pomysły).

import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AccessGate } from "./components/AccessGate";
import { Layout } from "./components/Layout";
import { Today } from "./features/Today";
import { TasksPage } from "./features/Tasks";
import { Ideas } from "./features/Ideas";
import { Settings } from "./features/Settings";
import { getToken } from "./lib/token";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Today /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "ideas", element: <Ideas /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

export default function App() {
  const [unlocked, setUnlocked] = useState(!!getToken());

  if (!unlocked) return <AccessGate onUnlock={() => setUnlocked(true)} />;
  return <RouterProvider router={router} />;
}
