import React, { useState, useEffect } from "react";

export const CodeInput = ({ onFinish, onError, length }) => {
  const [currEntry, setCurrEntry] = useState("");
  const [currIndex, setCurrIndex] = useState(0);
  const reg = /[0-9]/;
  let initVals = [];
  for(let i = 0; i < length; i++) {
    initVals.push("");
  }
  const [values, setValues] = useState(initVals);

  const handleSubmit = async (vals) => {
    try {
      await onFinish(vals.join(""));
    } catch(e) {
      onError(e);
      setValues(initVals);
      highlightBox(0);
    }
  };

  const handleChange = async () => {
    if(!reg.test(currEntry)) return;

    let newVals = values.slice();
    newVals[currIndex] = currEntry;
    setValues(newVals);
    highlightBox(currIndex + 1);
    if(currIndex >= length - 1 && !newVals.some((val) => val === "")) {
      document.getElementById("input-" + currIndex).blur();
      await handleSubmit(newVals);
    }
  };

  const highlightBox = (idx) => {
    idx = Math.max(Math.min(length - 1, idx), 0);
    setCurrIndex(idx);
    document.getElementById("input-" + idx).focus();
  };

  const handleKeyDown = async (event) => {
    let newVals;
    event.persist();
    switch(event.keyCode) {
      case 8: // Backspace
        newVals = values.slice();
        newVals[currIndex] = "";
        setValues(newVals);
        highlightBox(currIndex - 1);
        break;
      case 13: // enter
        if(!values.some((val) => val === "")) {
          document.getElementById("input-" + currIndex).blur();
          await handleSubmit(values);
        }
        break;
      case 37: // left arrow
        highlightBox(currIndex - 1);
        break;
      case 38: // up arrow
        newVals = values.slice();
        newVals[currIndex] = ((parseInt(newVals[currIndex]) + 1) % 10) || "0";
        setValues(newVals);
        break;
      case 39: // right arrow
        highlightBox(currIndex + 1);
        break;
      case 40: // down arrow
        newVals = values.slice();
        newVals[currIndex] = ((((parseInt(newVals[currIndex]) - 1) % 10) + 10) % 10) || "0";
        setValues(newVals);
        break;
    }

    if(event.keyCode === 8) {
      let newVals = values.slice();
      newVals[currIndex] = "";
      setValues(newVals);
      highlightBox(currIndex - 1);
    } else if(event.keyCode === 13 && !values.some((val) => val === "")) {
      document.getElementById("input-" + currIndex).blur();
    }
    setCurrEntry(String.fromCharCode(event.keyCode));
  };


  useEffect(() => {
    document.getElementById("input-0").focus();
  }, []);

  let inputs = values.map((_, idx) => {
    return <input
      style={{
        width: "50px",
        height: "50px",
        margin: "2px",
        background: "#FFFFFF",
        borderRadius: "6px",
        border: "1.5px solid rgba(0, 0, 0, 0.05)",
        boxShadow: "2px 2px 2px grey",
        textAlign: "center",
        fontFamily: "Bebas Neue, Oswald",
        fontWeight: "bold",
        fontSize: "20px",
      }}
      autoComplete="off"
      id={"input-" + idx}
      key={idx}
      onFocus={() => document.getElementById("input-" + idx).style.boxShadow = "4px 4px 4px grey"}
      onBlur={() => document.getElementById("input-" + idx).style.boxShadow = "2px 2px 2px grey"}
      type="text"
      value={values[idx]}
      onClick={() => { setCurrIndex(idx);}}

      onKeyDown={handleKeyDown}
      onChange={handleChange}
    />;
  });
  return (
    <form id="code-entry" onSubmit={() => onFinish(values.join(""))}>
      {inputs}
    </form>
  );
};