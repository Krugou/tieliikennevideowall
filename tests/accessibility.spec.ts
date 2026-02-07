import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";

test.describe("Accessibility", () => {
  test("should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for network idle to ensure content is fully loaded
    await page
      .waitForLoadState("networkidle")
      .catch(() => console.log("Network idle timeout"));

    // accessibility check
    try {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        // use absolute path just in case
        const violationsPath = path.resolve(process.cwd(), "violations.json");
        fs.writeFileSync(
          violationsPath,
          JSON.stringify(accessibilityScanResults.violations, null, 2),
        );
        console.log(`Wrote violations to ${violationsPath}`);
      }
      expect(accessibilityScanResults.violations).toEqual([]);
    } catch (e) {
      console.error("Accessibility check failed:", e);
      throw e;
    }
  });
});
