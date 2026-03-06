---
description: Set up comprehensive Playwright testing with accessibility, responsive, and functional tests
---

# Set Up Playwright Testing

## 1. Install Dependencies

// turbo

```bash
npm install -D @playwright/test @axe-core/playwright
```

// turbo

```bash
npx playwright install
```

## 2. Create `playwright.config.ts`

Create the config file with:

- Test directory: `./tests`
- Fully parallel execution
- 2 retries on CI, 0 locally
- HTML reporter
- Auto-start dev server (`npm run dev` on `http://localhost:5173`)
- Projects for: Chromium, Firefox, WebKit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)
- Trace on first retry
- Headless mode enabled by default

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

## 3. Create Test Files

### `tests/simple.spec.ts` - Sanity Check

```typescript
import { test, expect } from "@playwright/test";

test("sanity check", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/YourAppTitle/i);
});
```

### `tests/accessibility.spec.ts` - WCAG Compliance

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";

test.describe("Accessibility", () => {
  test("should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .waitForLoadState("networkidle")
      .catch(() => console.log("Network idle timeout"));

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    if (results.violations.length > 0) {
      fs.writeFileSync(
        path.resolve(process.cwd(), "violations.json"),
        JSON.stringify(results.violations, null, 2),
      );
    }
    expect(results.violations).toEqual([]);
  });
});
```

### `tests/responsive.spec.ts` - Responsive Design

```typescript
import { test, expect } from "@playwright/test";

test.describe("Responsive Design", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("app_lang", "en");
      localStorage.setItem("app_onboarded", "1");
    });
    await page.goto("/");
  });

  test("should display key elements on desktop", async ({ page, isMobile }) => {
    if (isMobile) test.skip();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should adapt layout for mobile", async ({ page, isMobile }) => {
    if (!isMobile) test.skip();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });
});
```

### `tests/functional.spec.ts` - Functional Tests

```typescript
import { test, expect } from "@playwright/test";

test.describe("Functional Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("app_lang", "en");
      localStorage.setItem("app_onboarded", "1");
    });
    await page.goto("/");
  });

  test("should toggle modal", async ({ page }) => {
    await page.getByRole("button", { name: /settings/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Use .first() when multiple close buttons exist
    await page.getByRole("button", { name: /close/i }).first().click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
```

## 4. Best Practices

- Use `page.addInitScript()` to set localStorage before navigation (bypass onboarding, set language)
- Use `.first()` when multiple elements match (e.g., close buttons)
- Use `getByRole()`, `getByTestId()`, `getByText()` for element selection
- Add `aria-label` and `data-testid` attributes to components for testability
- Handle network timeouts gracefully with `.catch()`

## 5. Run Commands

// turbo

```bash
npx playwright test --project=chromium
```

Other useful commands:

```bash
npx playwright test                           # Run all tests
npx playwright test tests/simple.spec.ts      # Single file
npx playwright test --headed                  # See browser window
npx playwright show-report                    # View HTML report
```
