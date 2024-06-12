import React from "react";
import Delta from "quill-delta";

function bindingTextarea(textarea, opts) {
  const { onTextChange, onSelectionChange } = opts;
  let currentSelectionRange = [-1, -1];
  let currentText = textarea.value;
  let isEditing = false;
  registerEventListeners();

  return () => {
    removeEventListeners();
  };

  function handleSelectionChange() {
    if (!textarea || isEditing) {
      return;
    }
    const { selectionStart, selectionEnd } = textarea;
    if (
      currentSelectionRange[0] !== selectionStart ||
      currentSelectionRange[1] !== selectionEnd
    ) {
      if (onSelectionChange) {
        onSelectionChange(selectionStart, selectionEnd);
      }
      currentSelectionRange = [textarea.selectionStart, textarea.selectionEnd];
    }
  }

  function handleInput(e) {
    const eventType = e.inputType;
    if (e.isEditing) {
      return;
    }

    const oldTAText = currentText;
    const newTAText = textarea.value;
    if (eventType.startsWith("history")) {
      onTextChange?.(eventType.endsWith("Undo") ? "undo" : "redo");
    } else {
      const delta = new Delta();
      const oldSelectionRange = currentSelectionRange;
      const newSelectionRange = [
        textarea.selectionStart,
        textarea.selectionEnd,
      ];
      if (eventType.startsWith("insert")) {
        delta.retain(oldSelectionRange[0]);
        if (oldSelectionRange[0] !== oldSelectionRange[1]) {
          delta.delete(oldSelectionRange[1] - oldSelectionRange[0]);
        }
        delta.insert(
          newTAText.substring(oldSelectionRange[0], newSelectionRange[0])
        );
      } else if (eventType.startsWith("delete")) {
        delta
          .retain(newSelectionRange[0])
          .delete(oldTAText.length - newTAText.length);
      } else {
        throw new Error("Unknown eventType: " + eventType);
      }
      onTextChange?.(delta.ops);
      handleSelectionChange();
    }
  }

  function handleCompositionStart() {
    isEditing = true;
  }

  function handleCompositionEnd() {
    isEditing = false;
    handleInput({
      inputType: "insertText",
      isEditing: false,
    });
  }

  // hack the textarea's value setter to get the latest value
  function captureTextAreaValue() {
    const { set, ...whateverleft } = Reflect.getOwnPropertyDescriptor(
      textarea,
      "value"
    );
    Reflect.defineProperty(textarea, "value", {
      ...whateverleft,
      set(newTAText) {
        currentText = newTAText;
        set.call(textarea, newTAText);
      },
    });

    return () => {
      Reflect.defineProperty(textarea, "value", {
        ...whateverleft,
        set,
      });
    };
  }

  function registerEventListeners() {
    handleSelectionChange();
    textarea.addEventListener("input", handleInput);
    document.addEventListener("compositionstart", handleCompositionStart);
    document.addEventListener("compositionend", handleCompositionEnd);
    document.addEventListener("selectionchange", handleSelectionChange);
  }

  function removeEventListeners() {
    captureTextAreaValue();
    textarea.removeEventListener("input", handleInput);
    document.removeEventListener("compositionstart", handleCompositionStart);
    document.removeEventListener("compositionend", handleCompositionEnd);
    document.removeEventListener("selectionchange", handleSelectionChange);
  }
}

export const Textarea = React.forwardRef((props, ref) => {
  const { onTextChange, onSelectionChange, ...whateverleft } = props;
  const innerRef = React.useRef();

  React.useEffect(() => {
    if (!innerRef.current) {
      return;
    }
    return bindingTextarea(innerRef.current, {
      onTextChange,
      onSelectionChange,
    });
  }, [onTextChange, onSelectionChange]);

  return (
    <textarea
      ref={(TARef) => {
        if (!TARef) {
          return;
        }
        if (typeof ref === "function") {
          ref(TARef);
        } else if (ref) {
          ref.current = TARef;
        }
        innerRef.current = TARef;
      }}
      {...whateverleft}
    />
  );
});
