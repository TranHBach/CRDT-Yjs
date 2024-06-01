import React, { useContext, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";
import { YjsTextarea } from "../YjsTextArea";
import { PasswordContext, RoomContext } from "../Context/ContextProvider";
import { openDB } from "idb";
import { ADJECTIVES, ANIMALS } from "../Name/cursorNames";
import { COLOR } from "../Name/cssColors";

const myColor = getRandomElement(COLOR);

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function TextPage() {
  const { room } = useContext(RoomContext);
  const { password } = useContext(PasswordContext);
  const [yText, setYText] = useState();
  const [awareness, setAwareness] = useState();
  const db = useRef();
  const roomValue = useRef("");
  const [wrtcProvider, setWrtcProvider] = useState();
  const [name, setName] = useState();

  // ws://localhost:4444
  useEffect(() => {
    const yDoc = new Y.Doc();
    const roomName = room + (password === "" ? "" : "-" + password);
    roomValue.current = roomName + "-version";
    const persistence = new IndexeddbPersistence(roomName, yDoc);
    const provider = new WebrtcProvider(room, yDoc, {
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

    const initialName = `${capitalizeFirstLetter(
      getRandomElement(ADJECTIVES)
    )} ${getRandomElement(ANIMALS)}`;

    provider.awareness.setLocalStateField("user", {
      color: myColor,
      clientName: initialName,
    });

    persistence.once("synced", () => {
      console.log("synced");
      const yText = yDoc.getText("text");
      setYText(yText);
      setAwareness(provider.awareness);
      setWrtcProvider(provider);
    });

    return () => {
      yDoc.destroy();
      persistence.destroy();
      provider.destroy();
      setYText(undefined);
      setAwareness(undefined);
      setWrtcProvider(undefined);
    };
  }, [password, room]);

  const handleChangeName = (name) => {
    if (wrtcProvider && name) {
      wrtcProvider.awareness.setLocalStateField("user", {
        color: myColor,
        clientName: name,
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-700">
      <div className="flex w-full items-center px-[10px]">
        <div className="flex items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="focus:outline-none rounded-md mr-[10px]"
          />
          <div
            className="w-auto h-[30px] rounded-lg bg-[#322C2B] text-white flex items-center justify-center cursor-pointer"
            onClick={() => handleChangeName(name)}
          >
            Change Name
          </div>
        </div>
        <div className="flex-grow flex justify-center">
          <div className="mb-[10px] text-white mr-[20px]">Room ID: {room}</div>
          <div className="mb-[10px] text-white"> Password: {password}</div>
        </div>
      </div>
      <YjsTextarea yText={yText} awareness={awareness} db={db.current} />
    </div>
  );
}

export default TextPage;
