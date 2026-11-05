"use client";

import ReactDOM from "react-dom";

export function ResourceHints() {
  ReactDOM.preconnect("https://push2.eastmoney.com", { crossOrigin: "anonymous" });
  ReactDOM.preconnect("https://push2his.eastmoney.com", { crossOrigin: "anonymous" });
  ReactDOM.preconnect("https://push2delay.eastmoney.com", { crossOrigin: "anonymous" });
  return null;
}
