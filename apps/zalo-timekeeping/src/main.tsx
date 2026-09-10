import "./styles.css";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { createRoot } from "react-dom/client";

import { App } from "./app";

dayjs.locale("vi");

createRoot(document.getElementById("app")!).render(<App />);
