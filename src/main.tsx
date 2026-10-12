import { HydrateSwap, StartClient } from "@tanstack/react-start";
import { hydrateRoot } from "react-dom/client";
import { getRouter } from "./router";

const router = getRouter();

if (typeof document !== "undefined") {
  let rootElement = document.getElementById("root");

  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.appendChild(rootElement);
  }

  hydrateRoot(
    rootElement,
    <HydrateSwap>
      <StartClient router={router} />
    </HydrateSwap>
  );
}
