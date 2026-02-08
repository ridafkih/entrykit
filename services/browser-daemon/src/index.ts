import { entry } from "@lab/entry-point";
import { env } from "./env";
import { setup } from "./setup";
import { main } from "./main";

entry({ name: "browser-daemon", env, setup, main });
