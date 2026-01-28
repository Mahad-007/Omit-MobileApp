import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { GlobalError } from "./components/GlobalError";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <GlobalError>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </GlobalError>
);
