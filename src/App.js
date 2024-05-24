import { useEffect, useState } from "react"
import { IndexeddbPersistence } from "y-indexeddb"
import { WebrtcProvider } from "y-webrtc"
import * as Y from "yjs"
import { YjsTextarea } from "./YjsTextArea"

const room = "pengx17-test-textarea3" 

const usercolors = [
  "#30bced",
  "#6eeb83",
  "#ffbc42",
  "#ecd444",
  "#ee6352",
  "#9ac2c9",
  "#8acb88",
  "#1be7ff"
]
const myColor = usercolors[Math.floor(Math.random() * usercolors.length)]

function App() {
  const [yText, setYText] = useState()
  const [awareness, setAwareness] = useState()

  
  // ws://localhost:4444
  useEffect(() => {
    const yDoc = new Y.Doc()
    const persistence = new IndexeddbPersistence(room, yDoc)
    const wrtcProvider = new WebrtcProvider(room, yDoc, {signaling: ["wss://signal-server-yjs.glitch.me"]})
    console.log(wrtcProvider)

    wrtcProvider.awareness.setLocalStateField("user", {
      color: myColor
    })

    persistence.once("synced", () => {
      console.log("synced")
      const yText = yDoc.getText("text")
      setYText(yText)
      setAwareness(wrtcProvider.awareness)
    })

    return () => {
      yDoc.destroy()
      persistence.destroy()
      wrtcProvider.destroy()
      setYText(undefined)
      setAwareness(undefined)
    }
  }, [])

  return (
    <div className="App">
      <YjsTextarea yText={yText} awareness={awareness} />
    </div>
  )
}

export default App
