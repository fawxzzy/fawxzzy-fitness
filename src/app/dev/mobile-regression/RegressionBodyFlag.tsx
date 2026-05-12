"use client";

import { useEffect } from "react";

export function RegressionBodyFlag() {
  useEffect(() => {
    document.documentElement.dataset.mobileRegression = "true";
    document.body.dataset.mobileRegression = "true";

    return () => {
      delete document.documentElement.dataset.mobileRegression;
      delete document.body.dataset.mobileRegression;
    };
  }, []);

  return null;
}
