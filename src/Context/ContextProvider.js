import React from "react";
import { createContext, useState } from "react";

export const RoomContext = createContext(null);

function ContextProvider({ children }) {
  const [room, setRoom] = useState(localStorage.getItem("room") || "");
  return (
    <RoomContext.Provider
      value={{
        room,
        setRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export default ContextProvider;
