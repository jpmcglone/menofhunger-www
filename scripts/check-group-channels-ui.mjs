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
const channels = ["announcements", "general", "random", "leaders"].map((name, index) => ({
  id: name,
  groupId: group.id,
  name,
  topic: name === "general" ? "Plans, progress, and showing up." : "",
  privacy: name === "leaders" ? "private" : "normal",
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
    body: "Ask @Thomas in <#random>, <#leaders> or <#restricted>. #ordinary stays plain.",
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
    canEdit: true,
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
const thomas = { ...me, id: 'thomas', username: 'Thomas', name: 'Thomas', premium: false, verifiedStatus: 'manual' };
const references = body => [...body.matchAll(/<#([A-Za-z0-9_-]+)>/g)].map(match => {
  const target = channels.find(channel => channel.id === match[1]);
  return { token: match[0], channelId: target?.id ?? null, name: target?.name ?? null, displayName: null, privacy: target?.privacy ?? 'private', accessible: !!target };
});
rows = rows.map(row => ({ ...row, channelReferences: references(row.body) }));
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
  console.warn("API", req.method, p);
  if (p === '/avatar.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#526779"/><text x="24" y="32" text-anchor="middle" fill="white" font-size="30">T</text></svg>'); return; }
  let data = [];
  let pagination = { nextCursor: null };
  if (p === "/checkins/leaderboard") data = { users: [], viewerRank: null, generatedAt: "2026-10-09T00:00:00Z" };
  else if (p === "/announcements/pending") data = null;
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
    data = [{ role: "owner", user: me }, { role: "member", user: thomas }];
  else if (p === "/users/preview/batch") data = { results: [thomas, me] };
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
        body: input.body, channelReferences: references(input.body),
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
thomas.avatarUrl = apiBase + '/avatar.svg';
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
  await context.addInitScript(() => localStorage.setItem('nuxt-color-mode', 'dark'));
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
    console.warn("PAGEERROR", e.message);
  });
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type()))
      console.warn("CONSOLE", m.text());
    if (/hydration|Vue warn|TypeError|ReferenceError/.test(m.text())) errors.push(m.text());
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
    .getByRole("textbox", { name: "Message general", exact: true })
    .waitFor({ timeout: 25000 });
  const editor = page.getByRole('textbox', { name: 'Message general', exact: true });
  const rootMessage = page.locator('.channel-message').first();
  await rootMessage.locator('a.moh-channel-reference').first().waitFor();
  if (await rootMessage.locator('a.moh-channel-reference').count() !== 2) throw Error('Public/private member channel links missing');
  if (await rootMessage.locator('span.moh-channel-reference').filter({ hasText: 'Private' }).count() !== 1) throw Error('Restricted channel is not a disabled Private pill');
  if (await rootMessage.locator('a[href*="explore"]').count()) throw Error('Channel hashtag navigates to feed search');
  await editor.fill('#ra');
  await page.getByRole('listbox', { name: 'Channels in this group' }).getByRole('option', { name: 'random' }).waitFor();
  await page.screenshot({ animations: "disabled", path: '/tmp/moh-channel-web-channel-autocomplete.png' });
  await editor.press('Enter');
  if (!(await editor.locator('[data-channel-reference]').textContent()).includes('random')) throw Error('Channel autocomplete did not insert pill');
  await editor.pressSequentially('@th');
  const mentionList = page.getByRole('listbox', { name: 'Mention suggestions' });
  await mentionList.getByRole('option').filter({ hasText: '@Thomas' }).waitFor();
  if (await mentionList.getByRole('option').filter({ hasText: '@Thomas' }).locator('img').count() !== 1) throw Error('Mention avatar missing');
  await page.screenshot({ animations: "disabled", path: '/tmp/moh-channel-web-mention-autocomplete.png' });
  await editor.press('Enter');
  const color = await editor.locator('.moh-mention').evaluate(el => getComputedStyle(el).color);
  const verifiedColor = await page.evaluate(() => { const el=document.createElement('span'); el.style.color='var(--moh-verified)'; document.body.append(el); const color=getComputedStyle(el).color; el.remove(); return color });
  if (color !== verifiedColor) throw Error('Mention tier color lost');
  await page.screenshot({ animations: "disabled", path: '/tmp/moh-channel-web-desktop.png' });
  await editor.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.channel-message').length > 1);
  if (!rows.some(row => row.body.includes('<#random>') && row.body.includes('@Thomas'))) throw Error('Sent body lost stable channel reference or mention');

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
  console.warn("UI loaded", await page.title(), errors);
  console.warn("TEXT", (await page.locator("body").innerText()).slice(0, 2000));
  await page
    .getByRole("textbox", { name: "Message general", exact: true })
    .fill("Saved draft for general");
  await rootMessage.locator('a.moh-channel-reference').filter({ hasText: 'random' }).click();
  await page
    .getByRole("textbox", { name: "Message random", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: /^general/ })
    .first()
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector('[contenteditable="true"][aria-label="Message general"]')
        ?.textContent === "Saved draft for general",
    {},
    { timeout: 5000 },
  );
  await page.getByText("1 reply", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Reply in thread", exact: true })
    .waitFor();
  await page.screenshot({ animations: "disabled", path: "/tmp/moh-channel-web-thread.png" });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Control+Shift+Period');
  await page.waitForFunction(() => document.documentElement.classList.contains('light'));
  await page.screenshot({ animations: "disabled", path: '/tmp/moh-channel-web-light.png' });
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
  const mobileEditor = touch.getByRole('textbox', { name: 'Reply in thread', exact: true });
  await mobileEditor.fill('First line');
  await mobileEditor.press('Enter');
  await mobileEditor.pressSequentially('Second line');
  if (!/First line\n+Second line/.test(await mobileEditor.innerText())) throw Error('Mobile Return did not insert newline: ' + JSON.stringify(await mobileEditor.innerText()));
  await touch.screenshot({ animations: "disabled", path: "/tmp/moh-channel-web-mobile.png" });
  await touch.locator(".touch-message-more:visible").first().tap();
  await touch
    .getByRole("dialog", { name: "Message actions", exact: true })
    .waitFor();
  await touch.getByRole("button", { name: "Close", exact: true }).last().tap();
  console.warn(
    "PASS channel pills/privacy, autocomplete/avatar/tier/keyboard/send, desktop hover/focus, destination drafts, thread navigation and touch actions; errors:",
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
      await pages[0].screenshot({ animations: "disabled", path: "/tmp/moh-channel-web-failure.png" });
    }
  }
  process.exitCode = 1;
} finally {
  await cleanup();
}
