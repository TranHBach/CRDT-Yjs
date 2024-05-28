import React, { useContext, useEffect, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";
import { YjsTextarea } from "../YjsTextArea";
import { PasswordContext, RoomContext } from "../Context/ContextProvider";

const usercolors = [
  "#30bced",
  "#6eeb83",
  "#ffbc42",
  "#ecd444",
  "#ee6352",
  "#9ac2c9",
  "#8acb88",
  "#1be7ff",
];
const myColor = usercolors[Math.floor(Math.random() * usercolors.length)];

function TextPage() {
  const { room } = useContext(RoomContext);
  const { password } = useContext(PasswordContext);
  const [yText, setYText] = useState();
  const [awareness, setAwareness] = useState();

  // ws://localhost:4444
  useEffect(() => {
    const yDoc = new Y.Doc();
    const persistence = new IndexeddbPersistence(room, yDoc);
    const wrtcProvider = new WebrtcProvider(room, yDoc, {
      signaling: ["wss://signal-server-yjs.glitch.me"],
      password: password,
    });

    wrtcProvider.awareness.setLocalStateField("user", {
      color: myColor,
    });

    persistence.once("synced", () => {
      console.log("synced");
      const yText = yDoc.getText("text");
      setYText(yText);
      setAwareness(wrtcProvider.awareness);
    });

    return () => {
      yDoc.destroy();
      persistence.destroy();
      wrtcProvider.destroy();
      setYText(undefined);
      setAwareness(undefined);
    };
  }, [room, password]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-700">
      <div className="mb-[10px] text-white">Room ID: {room}</div>
      <YjsTextarea yText={yText} awareness={awareness} />
    </div>
  );
}

export default TextPage;