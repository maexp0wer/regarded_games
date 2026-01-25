import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { graphql } from "ponder";

const app = new Hono();

// This is the critical part to allow your Next.js app to talk to Ponder
app.use("*", cors({
  origin: "http://localhost:3000",
  allowMethods: ["POST", "GET", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));

app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;