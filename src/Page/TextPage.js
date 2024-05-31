import React, { useContext, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";
import { YjsTextarea } from "../YjsTextArea";
import { PasswordContext, RoomContext } from "../Context/ContextProvider";
import { openDB } from "idb";

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
  const db = useRef();
  const roomValue = useRef("");
  // ws://localhost:4444
  useEffect(() => {
    const yDoc = new Y.Doc();
    const roomName = room + (password === "" ? "" : "-" + password);
    roomValue.current = roomName + "-version";
    const persistence = new IndexeddbPersistence(roomName, yDoc);
    const wrtcProvider = new WebrtcProvider(room, yDoc, {
      signaling: ["wss://signal-server-yjs.glitch.me"],
      password: password,
    });
    const initDB = async () => {
      db.current = await openDB(`${roomName}-version`, 1, {
        upgrade(db) {
          db.createObjectStore("version", {
            autoIncrement: true,
          });
        },
      });
      // const tx = await db.current.transaction("version", "readonly");
      // let cursor = await tx.store.openCursor();
      // while (cursor) {
      //   console.log(cursor.key, cursor.value);
      //   cursor = await cursor.continue();
      // }
    };
    initDB();
    wrtcProvider.awareness.setLocalStateField("user", {
      color: myColor,
      clientName: "Tran Huu Bach",
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
  }, [password, room]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-700">
      <div className="mb-[10px] text-white">Room ID: {room}</div>
      <YjsTextarea yText={yText} awareness={awareness} db={db.current} />
    </div>
  );
}

export default TextPage;
