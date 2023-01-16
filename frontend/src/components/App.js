import React from "react";
import { createRoot } from "react-dom/client";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import HomePage from "./HomePage";

export default function App(props) {
  return (
    <DndProvider backend={HTML5Backend}>
      <HomePage />
    </DndProvider>
  );
}
