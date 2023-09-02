import { getMiradoreDevices } from "@/lib/miradore";
import { sendSlackMessage } from "@/lib/slack";
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

type Application = {
  Identifier?: string;
  Name?: string;
  InventoryTime?: string;
  Version?: string | number;
};

type Device = {
  InvApplications: {
    InvApplication: Application[];
  };
  User: {
    Email: string;
    Firstname: string;
    Lastname: string;
  };
};

const getAppslist = async (listName: string, applications: Application[]) => {
  const list = await kv.get<string[]>(listName);

  if (!list) throw new Error("List not found");

  const inList = applications.filter((application) =>
    list.some(
      (identifier: string) =>
        identifier === application.Identifier || identifier === application.Name
    )
  );

  const notInList = applications.filter(
    (application) =>
      !list.some(
        (identifier: string) =>
          identifier === application.Identifier ||
          identifier === application.Name
      )
  );

  return { inList, notInList };
};

const updateList = async (listName: string, applications: Application[]) => {
  const list = await kv.get<string[]>(listName);

  if (!list) throw new Error("List not found");

  const newList = new Set([
    ...list,
    ...applications.map((app) => app.Identifier || app.Name),
  ]);

  await kv.set(listName, Array.from(newList));
};

const checkDeviceApplications = async (device: Device) => {
  console.log(`🆗 Checking applications for ${device.User.Email}`);
  const applications = device.InvApplications.InvApplication;

  // Check first if there is application in the blacklist
  const { notInList: notInBlacklist, inList: inBlacklist } = await getAppslist(
    "blacklist",
    applications
  );

  if (inBlacklist.length > 0) {
    console.log(
      `\t❌ Found ${inBlacklist.length} application(s) that are in the blacklist`
    );
    inBlacklist.forEach((application) => {
      sendSlackMessage(
        `🚨 ${device.User.Firstname} ${device.User.Lastname} has installed ${application.Name} on his device. This app is blacklisted, please advise.`
      );
    });
  }

  // Now check if there is applications not in the whitelist
  const { notInList: notInWhitelist } = await getAppslist(
    "whitelist",
    notInBlacklist
  );
  if (notInWhitelist.length > 0) {
    console.log(
      `\t🟡 Found ${
        notInWhitelist.length
      } application(s) that are not in the whitelist: ${notInWhitelist.map(
        (app) => app.Name
      )}`
    );

    // Check if those applications are already in the waitlist
    const { notInList: notInWaitlist, inList: inWaitlist } = await getAppslist(
      "waitlist",
      notInWhitelist
    );
    if (inWaitlist.length > 0) {
      console.log(
        `\t🟡 Found ${
          notInWhitelist.length - notInWaitlist.length
        } awaiting approval app, not sending events`
      );
    }
    if (notInWaitlist.length > 0) {
      console.log(
        `\t🟡 Found ${notInWaitlist.length} new application(s), sending events...`
      );
      notInWaitlist.forEach((application) => {
        sendSlackMessage(
          `ℹ️ ${device.User.Firstname} ${device.User.Lastname} has installed ${application.Name} on his device. This app is not in the whitelist, please advise.`
        );
      });

      // Update the waitlist
      await updateList("waitlist", notInWaitlist);
    }
  }

  console.log(`\t🟢 Done checking this device\n`);
};

export async function GET(request: Request) {
  const devices = (await getMiradoreDevices()) as Device[];
  console.log(`🆗 Found ${devices.length} devices to check`);
  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    await checkDeviceApplications(device);
  }

  return NextResponse.json({ message: "Job done" });
}
