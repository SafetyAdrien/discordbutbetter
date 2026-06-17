import * as React from "react";
import { useDevice } from "./useDevice";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const { width } = useDevice();
  return width < MOBILE_BREAKPOINT;
}
