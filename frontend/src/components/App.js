import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import HomePage from "./HomePage";
import OfflineBanner from "./OfflineBanner";
import { ThemeProvider } from "./ThemeContext";

export default function App(props) {
  return (
    <ThemeProvider>
      <DndProvider backend={HTML5Backend}>
        <OfflineBanner />
        <HomePage />
      </DndProvider>
    </ThemeProvider>
  );
}
