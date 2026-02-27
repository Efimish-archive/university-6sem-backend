import { Elysia } from "elysia";

export const logging = () => new Elysia({
  name: "elysia-logging-middleware",
}).onAfterResponse(
  { as: "global" },
  ({ request: { method, url }, set: { status }, responseValue }) => {
    const time = new Date().toLocaleTimeString("ru");
    console.log(`[${time}] ${method} ${url} -> ${status}`, responseValue);
  }
);
