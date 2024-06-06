import React, { useContext, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";
import { YjsTextarea } from "../YjsTextArea";
import History from "../Components/History";
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
  //const room = 1;
  const { password } = useContext(PasswordContext);
  const [yText, setYText] = useState();
  const [awareness, setAwareness] = useState();
  const db = useRef();
  const roomValue = useRef("");
  const [wrtcProvider, setWrtcProvider] = useState();
  const [name, setName] = useState();
  const [version, setVersion] = useState([]);
  const [ref, setRef] = useState();
  const [historyText, setHistoryText] = useState();
  //const [historyTime, setHistoryTime] = useState();

  useEffect(() => {
    handleSideBarClose();
  }, []);

  // ws://localhost:4444
  useEffect(() => {
    const yDoc = new Y.Doc();
    const roomName = room + (password === "" ? "" : "-" + password);
    roomValue.current = roomName + "-version";
    const persistence = new IndexeddbPersistence(roomName, yDoc);
    const provider = new WebrtcProvider(room, yDoc, {
      signaling: ["wss://signal-server-yjs.glitch.me"],
      password: password,
      maxConns: 100,
    });
    const initDB = async () => {
      db.current = await openDB(`${roomName}-version`, 1, {
        upgrade(db) {
          db.createObjectStore("version", {
            autoIncrement: true,
          });
        },
      });
    };
    initDB();

    const handleVersionUpdate = async () => {
      const tx = await db.current.transaction("version", "readonly");
      let cursor = await tx.store.openCursor();
      const versions = [];
      while (cursor) {
        versions.push({ key: cursor.key, value: cursor.value });
        cursor = await cursor.continue();
      }
      setVersion(versions);
    };

    window.addEventListener("versionStoreUpdated", handleVersionUpdate);

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
      window.removeEventListener("versionStoreUpdated", handleVersionUpdate);
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
  const handleSideBarClose = () => {
    const sidebar = document.querySelector(".sidebar");
    sidebar.style.display = "none";
  };
  const handleSideBarOpen = () => {
    const sidebar = document.querySelector(".sidebar");
    sidebar.style.display = "flex";
  };
  const handleRestoreClicked = () => {
    const input$ = ref.current;
    const textAreaLength = input$.value.length;
    yText.delete(0, textAreaLength);
    yText.insert(0, historyText);
    setHistoryText(undefined);
    //setHistoryTime(undefined);
  };
  const handleClickHistory = (text, time) => {
    setHistoryText(text);
    //setHistoryTime(time);
    handleSideBarClose();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-700">
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
            className="w-auto px-[10px] h-[30px] rounded-lg bg-[#322C2B] text-white flex items-center justify-center cursor-pointer"
            onClick={() => handleChangeName(name)}
          >
            Change Name
          </div>
        </div>
        <div className="flex-grow flex justify-center">
          <div className="mb-[10px] text-white mr-[20px]">Room ID: {room}</div>
          <div className="mb-[10px] text-white"> Password: {password}</div>
        </div>
        <div
          className="w-auto px-[10px] h-[30px] rounded-lg bg-[#322C2B] text-white flex items-center justify-center cursor-pointer"
          onClick={handleSideBarOpen}
        >
          Text History
        </div>
      </div>
      <div
        className="w-[300px] bg-[#322C2B] fixed top-0 right-0 h-full z-10 backdrop-blur-sm bg-opacity-90
       shadow overflow-y-auto flex flex-col gap-y-[15px] sidebar
      "
      >
        <div className="relative">
          <img
            src="/img/close.png"
            alt=""
            className="absolute w-[30px] h-[30px] left-[10px] top-[17px] cursor-pointer"
            onClick={handleSideBarClose}
          />
          <p className="text-white text-center mt-[15px] text-[20px]">
            Text History
          </p>
        </div>

        {version.map((version, index) => (
          <History
            key={index}
            time={version.key}
            text={version.value}
            handleClick={handleClickHistory}
          />
        ))}
      </div>
      <div className="w-full flex-grow flex">
        <div className="h-full flex-grow flex flex-col justify-center items-center">
          <YjsTextarea
            yText={yText}
            awareness={awareness}
            db={db.current}
            setRef={setRef}
          />
        </div>
        {historyText ? (
          <div className="w-1/2 flex">
            <textarea
              className="flex-grow px-[12px] py-[16px] text-[24px] mr-[8px] border border-black resize-none"
              value={historyText}
              readOnly
            />
            <div className="flex flex-col items-center justify-center gap-y-[15px]">
              <div
                className="w-[70px] h-[30px] rounded-md bg-[#322C2B] text-white flex items-center justify-center cursor-pointer"
                onClick={handleRestoreClicked}
              >
                Restore
              </div>
              <div
                className="w-[70px] h-[30px] rounded-md bg-white text-[#322C2B] flex items-center justify-center cursor-pointer"
                onClick={() => {
                  setHistoryText(undefined);
                  //setHistoryTime(undefined);
                }}
              >
                Cancel
              </div>
            </div>
          </div>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
}

export default TextPage;
