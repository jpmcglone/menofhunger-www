import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
const repo = fileURLToPath(new URL("..", import.meta.url));
const me = {
  id: "fixture-member",
  username: "fixture",
  name: "Fixture Member",
  phone: "+15555550111",
  verifiedStatus: "manual",
  premium: true,
  premiumPlus: false,
  isOrganization: false,
  usernameIsSet: true,
  menOnlyConfirmed: true,
  birthdate: "1990-01-01",
  locationPromptSkipped: true,
  interests: ["fitness"],
  heardAboutUs: "other",
  hasRecruiter: false,
  avatarUrl: null,
  groupsUnread: { total: 0, byGroupId: {} },
  messageUnreadCounts: { primary: 0, requests: 0 },
  notificationUndeliveredCount: 0,
};
const group = {
  id: "fixture-group",
  slug: "fixture",
  name: "Early risers",
  description: "Synthetic channel UI test",
  rules: null,
  avatarImageUrl: null,
  coverImageUrl: null,
  joinPolicy: "open",
  memberCount: 12,
  isFeatured: false,
  featuredOrder: 0,
  createdAt: "2026-10-06T00:00:00Z",
  viewerMembership: { role: "owner", status: "active" },
  viewerPendingApproval: false,
  channelsAvailable: true,
  channelPersonalCount: 1,
};
const channels = ["announcements", "general", "random"].map((name, index) => ({
  id: name,
  groupId: group.id,
  name,
  topic: name === "general" ? "Plans, progress, and showing up." : "",
  privacy: "normal",
  defaultPurpose: name,
  archivedAt: null,
  revision: 1,
  viewerUpdatedAt: null,
  readThrough: 0,
  hasUnread: index === 1,
  personalCount: index === 1 ? 1 : 0,
  preference: "mentions",
  capabilities: {
    canSend: true,
    canReact: true,
    canManage: true,
    canInvite: false,
    canModerate: true,
    canArchive: false,
    canRename: false,
  },
}));
let rows = [
  {
    id: "root",
    conversationId: "fixture-conversation",
    channelId: "general",
    sender: {
      ...me,
      id: "other",
      username: "james",
      name: "James",
      orgAffiliations: [],
    },
    createdAt: "2026-10-06T11:30:00Z",
    body: "Anyone up for a walk before work tomorrow?",
    kind: "text",
    media: [],
    reactions: [],
    revision: 1,
    sequence: 1,
    threadRootId: null,
    replyCount: 1,
    lastReplyAt: null,
    following: false,
    pinned: false,
    canEdit: false,
    canDelete: true,
    deletedForAll: false,
    deletedForMe: false,
  },
  {
    id: "reply",
    conversationId: "fixture-conversation",
    channelId: "general",
    sender: { ...me, orgAffiliations: [] },
    createdAt: "2026-10-06T11:31:00Z",
    body: "Count me in. Six at the park?",
    kind: "text",
    media: [],
    reactions: [],
    revision: 1,
    sequence: 2,
    threadRootId: "root",
    replyCount: 0,
    lastReplyAt: null,
    following: true,
    pinned: false,
    canEdit: true,
    canDelete: true,
    deletedForAll: false,
    deletedForMe: false,
  },
];
const api = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "content-type",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  if (req.method === "OPTIONS") {
    res.end();
    return;
  }
  const u = new URL(req.url, "http://fixture");
  const p = u.pathname.replace(/^\/v1/, "");
  console.log("API", req.method, p);
  let data = [];
  let pagination = { nextCursor: null };
  if (p === "/announcements/pending") data = null;
  else if (p === "/auth/me") data = me;
  else if (p.includes("switchable"))
    data = [{ ...me, isCurrent: true, unreadBadgeCount: 1 }];
  else if (p === "/groups/by-slug/fixture") data = group;
  else if (p === "/groups/me") data = [group];
  else if (p === "/groups/fixture-group/channels") data = channels;
  else if (p.endsWith("/reactions"))
    data = [
      { id: "check", emoji: "✅", label: "Check" },
      { id: "eyes", emoji: "👀", label: "Eyes" },
      { id: "raised_hands", emoji: "🙌", label: "Raised hands" },
    ];
  else if (p.includes("/channels/") && p.endsWith("/members"))
    data = [{ role: "owner", user: me }];
  else if (p.endsWith("/context"))
    data = {
      messages: rows.filter((r) => r.id === "root"),
      threadRootId: null,
      targetId: "root",
    };
  else if (p.includes("/channels/") && p.endsWith("/messages")) {
    if (req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      data = {
        ...rows[0],
        id: "sent-" + rows.length,
        sender: { ...me, orgAffiliations: [] },
        body: input.body,
        channelId: p.split("/")[4],
        clientRequestId: input.clientRequestId,
        sequence: rows.length + 1,
        threadRootId: input.threadRootId ?? null,
        replyCount: 0,
      };
      rows.push(data);
    } else {
      data = rows.filter(
        (r) =>
          r.channelId === p.split("/")[4] &&
          r.threadRootId === (u.searchParams.get("root") || null),
      );
      pagination.latestSequence = rows.length;
    }
  } else if (p.includes("/channels/")) data = {};
  else if (p === "/notifications/count") data = { count: 0 };
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ data, pagination }));
});
await new Promise((r) => api.listen(0, "127.0.0.1", r));
const apiBase = "http://127.0.0.1:" + api.address().port + "/v1";
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const preview = spawn(process.execPath, [".output/server/index.mjs"], {
  cwd: repo,
  env: {
    ...process.env,
    PORT: String(port),
    HOST: "127.0.0.1",
    NUXT_API_BASE_URL: apiBase,
    NUXT_PUBLIC_API_BASE_URL: apiBase,
  },
  stdio: ["ignore", "ignore", "pipe"],
});
let serverErrors = "";
preview.stderr.on("data", (d) => (serverErrors += d));
let browser;
const cleanup = async () => {
  await browser?.close();
  preview.kill("SIGTERM");
  api.close();
};
process.once("SIGINT", () => void cleanup());
process.once("SIGTERM", () => void cleanup());
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:" + port + "/about")).ok) break;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    {
      name: "moh_session",
      value: "synthetic-fixture",
      url: "http://127.0.0.1:" + port,
    },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("PAGEERROR", e.message);
  });
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type()))
      console.log("CONSOLE", m.text());
    if (/hydration|Vue warn/.test(m.text())) errors.push(m.text());
  });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto(
    "http://127.0.0.1:" + port + "/groups/fixture/channels/general",
    { waitUntil: "domcontentloaded" },
  );
  await page
    .getByRole("textbox", { name: "Message #general", exact: true })
    .waitFor({ timeout: 25000 });
  await page.screenshot({ path: "/tmp/moh-channel-web-desktop.png" });
  const toolbar = page.locator(".message-toolbar").first();
  await page.mouse.move(0, 0);
  if ((await toolbar.evaluate((el) => getComputedStyle(el).opacity)) !== "0")
    throw Error("Toolbar visible without focus");
  await page.locator(".channel-message").first().hover();
  if ((await toolbar.evaluate((el) => getComputedStyle(el).opacity)) !== "1")
    throw Error("Toolbar missing on hover");
  await page.locator(".channel-message").first().focus();
  if ((await toolbar.evaluate((el) => getComputedStyle(el).opacity)) !== "1")
    throw Error("Toolbar missing on keyboard focus");
  console.log("UI loaded", await page.title(), errors);
  console.log("TEXT", (await page.locator("body").innerText()).slice(0, 2000));
  await page
    .getByRole("textbox", { name: "Message #general", exact: true })
    .fill("Saved draft for general");
  await page.getByRole("link", { name: "random", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Message #random", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: /^general/ })
    .first()
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector('textarea[aria-label="Message #general"]')
        ?.value === "Saved draft for general",
    {},
    { timeout: 5000 },
  );
  await page.getByText("1 reply", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Reply in thread", exact: true })
    .waitFor();
  await page.screenshot({ path: "/tmp/moh-channel-web-thread.png" });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobile.addCookies([
    {
      name: "moh_session",
      value: "synthetic-fixture",
      url: "http://127.0.0.1:" + port,
    },
  ]);
  const touch = await mobile.newPage();
  touch.on("pageerror", (error) => errors.push(error.message));
  await touch.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await touch.goto(
    "http://127.0.0.1:" + port + "/groups/fixture/channels/general?thread=root",
  );
  await touch
    .getByRole("textbox", { name: "Reply in thread", exact: true })
    .waitFor();
  await touch.screenshot({ path: "/tmp/moh-channel-web-mobile.png" });
  await touch.locator(".touch-message-more").first().tap();
  await touch
    .getByRole("dialog", { name: "Message actions", exact: true })
    .waitFor();
  await touch.getByRole("button", { name: "Close", exact: true }).last().tap();
  console.log(
    "PASS desktop hover/focus, destination drafts, thread navigation and touch actions; errors:",
    errors,
  );
  if (errors.length) throw Error(errors.join("\n"));
} catch (e) {
  console.error(e);
  console.error(serverErrors.slice(-1500));
  if (browser) {
    const pages = browser.contexts().flatMap((c) => c.pages());
    if (pages[0]) {
      console.error(pages[0].url());
      console.error((await pages[0].content()).slice(-2000));
      console.error(
        (await pages[0].locator("body").innerText()).slice(0, 3000),
      );
      await pages[0].screenshot({ path: "/tmp/moh-channel-web-failure.png" });
    }
  }
  process.exitCode = 1;
} finally {
  await cleanup();
}
