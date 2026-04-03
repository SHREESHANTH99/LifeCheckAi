"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((res) => res.json())
      .then((payload) => setData(payload))
      .catch(() => setData({ error: "Unable to reach backend" }));
  }, []);

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold">LifeCheck AI</h1>

      <div className="mt-5">
        <p>Backend Response:</p>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </main>
  );
}
