"use client";

import { useState, useRef } from "react";

// Keywords from isWatchedUser() in tracker/src/signalDetector.ts
const KEYWORDS = [
  { kw: "ALL",         desc: "Everyone" },
  { kw: "AUTHOR",      desc: "Issue author" },
  { kw: "MAINTAINER",  desc: "Owner / member" },
  { kw: "CONTRIBUTOR", desc: "Contributors" },
  { kw: "ASSIGNEE",    desc: "Assigned user" },
] as const;

const KEYWORD_SET = new Set(KEYWORDS.map((k) => k.kw));

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
}

export function WatchUsersInput({ value, onChange }: Props) {
  const [inputVal, setInputVal] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const stripped = raw.trim().replace(/^@/, "");
    if (!stripped) return;
    // Normalize to uppercase if it matches a keyword (case-insensitive)
    const normalized = KEYWORD_SET.has(stripped.toUpperCase())
      ? stripped.toUpperCase()
      : stripped;
    if (!value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setInputVal("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  const availableKeywords = KEYWORDS.filter((k) => !value.includes(k.kw));

  return (
    <div>
      <div
        className="tag-input-container"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className={`tag${KEYWORD_SET.has(tag) ? " tag-keyword" : ""}`}
          >
            {KEYWORD_SET.has(tag) ? tag : `@${tag}`}
            <button
              type="button"
              className="tag-remove"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              aria-label={`Remove ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="tag-inner-input"
          value={inputVal}
          placeholder={value.length === 0 ? "Add username or keyword…" : ""}
          onChange={(e) => setInputVal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            if (inputVal.trim()) addTag(inputVal);
            setFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(inputVal);
            }
            if (e.key === "Backspace" && !inputVal && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
        />
      </div>

      {focused && availableKeywords.length > 0 && (
        <div className="watch-keywords">
          <span className="watch-keywords-label">Quick add:</span>
          {availableKeywords.map(({ kw, desc }) => (
            <button
              key={kw}
              type="button"
              className="keyword-chip"
              onMouseDown={(e) => { e.preventDefault(); addTag(kw); }}
            >
              {kw}
              <span className="keyword-chip-desc">{desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
