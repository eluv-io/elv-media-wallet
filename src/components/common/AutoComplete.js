import React, {useEffect, useRef, useState} from "react";
import {v4 as UUID} from "uuid";

const AutoComplete = ({
  value,
  placeholder,
  onChange,
  options=[],
  className=""
}) => {
  const ref = useRef();
  const [id] = useState(`autocomplete-${UUID()}`);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const [inputValue, setInputValue] = useState(value);

  options = options.filter((option, index) => options.indexOf(option) === index);

  const matchingOptions = options.filter(option => (option || "").toLowerCase().includes((inputValue || "").toLowerCase()));

  let selectedOptionIndex = matchingOptions.findIndex(option => option === selectedOption);
  selectedOptionIndex = selectedOptionIndex === -1 ? 0 : selectedOptionIndex;

  useEffect(() => {
    const onClickOutside = event => {
      const element = document.getElementById(id);

      if(!element || !element.contains(event.target)) {
        setShowSuggestions(false);

        if(inputValue && selectedOption && selectedOption !== inputValue && !matchingOptions.includes(inputValue)) {
          setInputValue(selectedOption);
        }
      }
    };

    document.addEventListener("click", onClickOutside);

    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  useEffect(() => {
    // Only trigger onChange when a matching value is input
    if(inputValue !== value && matchingOptions.includes(inputValue)) {
      onChange(inputValue);
    } else if(!inputValue) {
      onChange("");
    }
  }, [inputValue]);

  useEffect(() => {
    // Update selected option
    if(!matchingOptions.includes(selectedOption)) {
      setSelectedOption(matchingOptions[0]);
    } else if(selectedOption === inputValue) {
      setShowSuggestions(false);
    }

    // Update scroll position
    if(typeof selectedOptionIndex === "undefined") { return; }

    const parentElement = document.getElementById(`${id}-options`);
    const element = document.getElementById(`${id}-option-${selectedOptionIndex}`);

    if(!parentElement || !element) { return; }

    const elementInView = element.offsetTop >= parentElement.scrollTop && (element.offsetTop + element.offsetHeight < parentElement.scrollTop + parentElement.offsetHeight);

    if(elementInView) { return; }

    const elementMidpoint = element.offsetTop + (element.offsetHeight / 2);
    const parentMidpoint = parentElement.scrollTop + (parentElement.offsetHeight / 2);

    if(elementMidpoint < parentMidpoint) {
      parentElement.scrollTop = Math.max(0, element.offsetTop - 5);
    } else {
      parentElement.scrollTop = Math.max(0, (element.offsetHeight + element.offsetTop + 5) - parentElement.offsetHeight);
    }
  }, [selectedOption, inputValue]);

  return (
    <div
      id={id}
      ref={ref}
      className={`autocomplete ${className}`}
    >
      <input
        placeholder={placeholder}
        value={inputValue}
        onFocus={async () => {
          setShowSuggestions(true);

          await new Promise(resolve => setTimeout(resolve, 50));

          const parentElement = document.getElementById(`${id}-options`);
          const element = document.getElementById(`${id}-option-${selectedOptionIndex}`);

          if(!parentElement || !element) { return; }

          parentElement.scrollTop = element.offsetTop;
        }}
        aria-autocomplete="list"
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-haspopup={showSuggestions}
        aria-owns={`${id}-options`}
        onChange={event => {
          setInputValue(event.target.value);
          setShowSuggestions(true);
        }}
        onKeyDown={event => {
          if(event.key === "Enter" && selectedOption) {
            setInputValue(selectedOption);
            setShowSuggestions(false);
            return;
          }

          let newOptionIndex = selectedOptionIndex;
          if(event.key === "ArrowUp") {
            newOptionIndex = selectedOptionIndex === 0 ? matchingOptions.length -1 : selectedOptionIndex - 1;
          } else if(event.key === "ArrowDown") {
            newOptionIndex = (selectedOptionIndex + 1) % matchingOptions.length;
          }

          setSelectedOption(matchingOptions[newOptionIndex]);
        }}
        className="autocomplete__input"
      />
      <div
        id={`${id}-options`}
        className={`autocomplete__options ${showSuggestions ? "autocomplete__options-visible" : ""}`}
      >
        <ul className="autocomplete__options-list" role="listbox">
          {
            matchingOptions.length === 0 ?
              <li className="autocomplete__option autocomplete__option-empty">
                No Matching Options
              </li> :
              matchingOptions.map((option, index) =>
                <li
                  id={`${id}-option-${index}`}
                  role="option"
                  onClick={() => setInputValue(option)}
                  className={`autocomplete__option ellipsis ${option === selectedOption ? "autocomplete__option-selected" : ""}`}
                  key={`autocomplete-option-${index}`}
                >
                  { option }
                </li>
              )
          }
        </ul>
      </div>
    </div>
  );
};

export default AutoComplete;
