import React from "react";
import * as Y from "yjs";
import { Textarea } from "./TextArea";

const useAwarenessUserInfos = (awareness) => {
  const [userInfos, setUserInfos] = React.useState([]);

  React.useEffect(() => {
    if (!awareness) {
      return;
    }
    const listener = () => {
      setUserInfos(
        [...awareness.getStates()].map(([id, info]) => {
          return {
            ...info.user,
            cursor: info.cursor,
            id,
            current: awareness.clientID === id,
          };
        })
      );
    };
    listener();
    awareness.on("change", listener);
    return () => {
      awareness.off("change", listener);
    };
  }, [awareness]);

  return userInfos;
};

const toRelative = (yPosAbs, yText) => {
  const relPos =
    yPosAbs != null && yText
      ? Y.createRelativePositionFromTypeIndex(yText, yPosAbs)
      : null;
  return relPos ?? null;
};

const toAbsolute = (yPosRel, yDoc) => {
  const absPos =
    yPosRel && yDoc
      ? Y.createAbsolutePositionFromRelativePosition(yPosRel, yDoc)
      : null;
  return absPos?.index ?? -1;
};

export const YjsTextarea = (props) => {
  const { yText, awareness } = props;
  const userInfos = useAwarenessUserInfos(awareness);
  const ref = React.useRef(null);
  const helperRef = React.useRef(null);
  const cursorsRef = React.useRef(null);

  const undoManager = React.useMemo(() => {
    if (yText) {
      return new Y.UndoManager(yText, {
        captureTimeout: 200,
      });
    }
  }, [yText]);

  const resetLocalAwarenessCursors = React.useCallback(() => {
    if (ref.current && awareness && yText) {
      const s = ref.current.selectionStart;
      const e = ref.current.selectionEnd;
      awareness.setLocalStateField("cursor", {
        anchor: toRelative(s, yText),
        focus: toRelative(e, yText),
      });
    }
  }, [yText, awareness]);

  // handle local update: apply deltas to yText
  const handleLocalTextChange = React.useCallback(
    (delta) => {
      const input$ = ref.current;
      if (yText && undoManager && input$) {
        if (delta === "undo") {
          undoManager.undo();
        } else if (delta === "redo") {
          undoManager.redo();
        } else {
          yText.applyDelta(delta);
        }
        input$.value = yText.toString();
      }
      resetLocalAwarenessCursors();
    },
    [undoManager, yText, resetLocalAwarenessCursors]
  );

  // handle remote update: pull text from yDoc and set to native elements
  React.useEffect(() => {
    if (yText && yText.doc && ref.current && awareness) {
      const yDoc = yText.doc;
      const input$ = ref.current;
      const syncFromYDoc = (_, origin) => {
        if (
          (origin !== undoManager && origin != null) ||
          input$.value !== yText.toString()
        ) {
          console.log("This value is ", input$.value);
          input$.value = yText.toString();
          const cursor = awareness.getLocalState()?.cursor;
          const newRange = [
            toAbsolute(cursor?.anchor, yDoc),
            toAbsolute(cursor?.focus, yDoc),
          ];
          input$.setSelectionRange(newRange[0], newRange[1]);
          resetLocalAwarenessCursors();
        }
      };

      syncFromYDoc();
      yDoc.on("update", syncFromYDoc);

      return () => {
        yDoc.off("update", syncFromYDoc);
      };
    }
  }, [yText, undoManager, resetLocalAwarenessCursors, awareness]);

  // render a user indicator
  const renderUserIndicator = React.useCallback(
    (userInfo) => {
      const yDoc = yText?.doc;
      const text = yText?.toString() ?? "";
      const overlayRect = helperRef.current?.getBoundingClientRect();
      if (!yDoc || !userInfo.cursor || !overlayRect || userInfo.current) {
        return [];
      }
      const { anchor, focus } = userInfo.cursor;

      const [start, end] = [toAbsolute(anchor, yDoc), toAbsolute(focus, yDoc)];
      let rects = getClientRects(start, end);

      return rects.map((rect, idx) => {
        return (
          <div
            key={userInfo.id + "_" + idx}
            className="user-indicator"
            style={{
              // @ts-ignore
              "--user-color": userInfo.color,
              left: rect.left - overlayRect.left,
              top: rect.top - overlayRect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            {idx === rects.length - 1 && (
              <div className="user-cursor">
                <div className="user-cursor-label">{userInfo.id}</div>
              </div>
            )}
            <div className="user-cursor-selection" />
          </div>
        );
      });

      function getClientRects(start, end) {
        if (!helperRef.current || start === -1 || end === -1) {
          return [];
        }
        // have to place a new line to make sure cursors can be rendered
        helperRef.current.textContent = text + "\n";
        if (helperRef.current.firstChild == null) {
          return [];
        }
        const textNode = helperRef.current.firstChild;
        const range = document.createRange();
        range.setStart(textNode, start);
        range.setEnd(textNode, end);

        return Array.from(range.getClientRects());
      }
    },
    [yText]
  );

  // sync scroll positions
  React.useEffect(() => {
    if (ref.current && cursorsRef.current && helperRef.current) {
      const input$ = ref.current;
      const cursors$ = cursorsRef.current;
      const helper$ = helperRef.current;
      const onScroll = () => {
        cursors$.scrollLeft = input$.scrollLeft;
        cursors$.scrollTop = input$.scrollTop;
        helper$.scrollLeft = input$.scrollLeft;
        helper$.scrollTop = input$.scrollTop;
      };
      input$.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        input$.removeEventListener("scroll", onScroll);
      };
    }
  }, []);

  return (
    <div className="text-container bg-white">
      <Textarea
        className="input"
        ref={ref}
        onSelectionChange={resetLocalAwarenessCursors}
        onTextChange={handleLocalTextChange}
      />
      {/*This is for Cursor of user display*/}
      <div className="input overlay selection-helper-container hidden">
        <div className="selection-helper" ref={helperRef} />
      </div>
      <div className="overlay cursors-container" ref={cursorsRef}>
        <div className="cursors-wrapper">
          {userInfos.flatMap(renderUserIndicator)}
        </div>
      </div>
    </div>
  );
};
