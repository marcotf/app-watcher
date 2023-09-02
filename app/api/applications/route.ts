import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

// Update list
export async function POST(request: Request) {
  const body = await request.json();
  const { listName, applications } = body as {
    listName: string;
    applications: string[];
  };

  const list = await kv.get<string[]>(listName);

  if (!list) throw new Error("List not found");

  // Find entries in applications that are also in waitlist and remove them from waitlist
  if (listName === "whitelist") {
    const waitlist = await kv.get<string[]>("waitlist");
    if (!waitlist) return;

    const newWaitlist = waitlist.filter(
      (entry) => !applications.includes(entry)
    );

    kv.set("waitlist", newWaitlist);
  }

  const newList = Array.from(new Set([...list, ...applications]));

  await kv.set(listName, newList);

  return NextResponse.json({ newList });
}
