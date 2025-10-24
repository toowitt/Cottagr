"use client";

import { useMemo, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export function EditorSkeleton() {
  return <div className="h-48 animate-pulse rounded-2xl border border-gray-800 bg-gray-900/60" />;
}

export default function V2Editor() {
  const [value, setValue] = useState("");

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        ["link"],
        ["clean"],
      ],
    }),
    [],
  );

  const formats = useMemo(
    () => ["header", "bold", "italic", "underline", "strike", "list", "indent", "link"],
    [],
  );

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 text-white">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={setValue}
        modules={modules}
        formats={formats}
        className="bg-gray-900 text-white"
      />
    </div>
  );
}
