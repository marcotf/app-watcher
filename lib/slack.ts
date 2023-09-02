import axios from "axios";

export const sendSlackMessage = (message: string) =>
  axios.post(
    process.env.SLACK_WEBHOOK_URL || "",
    {
      text: message,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
