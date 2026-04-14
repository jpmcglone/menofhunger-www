---
name: ssr-hydration
description: >-
  Write SSR-safe Nuxt 3 Vue components and debug hydration mismatches. Use when
  writing or editing .vue components with client-dependent rendering, when the
  user reports hydration warnings, when fixing "Hydration node mismatch" or
  "Hydration children mismatch" errors, or when adding v-if/v-show logic that
  depends on auth state, browser APIs, or mount lifecycle.
---

# SSR Hydration: Prevention and Debugging

## Why mismatches happen

The server renders HTML without browser APIs, auth cookies, or `onMounted` state.
The client hydrates against that HTML. If the VDOM differs from the server HTML,
Vue logs a warning and patches the DOM (expensive, can cause flicker/bugs).

---

## Prevention: Writing SSR-Safe Code

### 1. v-if vs v-show for client-only UI

`v-if` changes DOM structure. If the condition differs between server and client, it mismatches.

```html
<!-- BAD: mounted is false on server, true on client -->
<div v-if="mounted">...</div>

<!-- GOOD: same DOM on both sides, CSS hides it -->
<div v-show="mounted">...</div>
```

Use `v-show` when the element must exist in server HTML but only appear after mount.
Use `v-if` only when the condition is stable across server and client (e.g. data from `useAsyncData`).

### 2. Responsive variants: CSS only, never v-if

```html
<!-- BAD -->
<button v-if="!isMobile">Desktop</button>
<button v-else>Mobile</button>

<!-- GOOD -->
<button class="hidden sm:inline-flex">Desktop</button>
<button class="inline-flex sm:hidden">Mobile</button>
```

### 3. Client-only state: guard with a hydrated ref

Auth state (`isAuthed`, `isPremium`), browser measurements, and any `ref` set in
`onMounted` will differ between server and client.

```ts
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })

const dynamicStyle = computed(() =>
  hydrated.value && someClientValue.value > 0
    ? { paddingBottom: `${someClientValue.value}px` }
    : undefined
)
```

```html
<div class="pb-[4.5rem]" :style="dynamicStyle">
```

### 4. Never access browser APIs at top level

```ts
// BAD
const height = ref(window.innerHeight)

// GOOD
const height = ref(0)
onMounted(() => { height.value = window.innerHeight })
```

### 5. Opt out of SSR for client-heavy pages

Auth-gated pages (editors, dashboards, settings) gain nothing from SSR:

```ts
definePageMeta({ ssr: false })
```

### 6. Use ClientOnly for third-party browser widgets

```html
<ClientOnly>
  <MyMapComponent />
</ClientOnly>
```

### 7. TransitionGroup causes mismatches

`<TransitionGroup>` inserts internal VDOM markers the server never emits.
Swap it in only after mount:

```html
<TransitionGroup v-if="mounted" name="fade" tag="div" class="contents">
  <Item v-for="item in items" :key="item.id" />
</TransitionGroup>
<div v-else class="contents">
  <Item v-for="item in items" :key="item.id" />
</div>
```

### 8. Common dangerous patterns

| Pattern | Risk | Fix |
|---------|------|-----|
| `v-if="isAuthed"` in SSR page | Server has no cookie context | Use `v-show`, or `definePageMeta({ ssr: false })` |
| `v-if="mounted && !readonly"` | Server omits node | Use `v-show="mounted && !readonly"` |
| `:class="{ active: isMobile }"` | `isMobile` unknown on server | Use Tailwind responsive classes |
| `Date.now()` / `new Date()` in template | Server/client times differ | Compute in `onMounted` or use `<ClientOnly>` |
| `Math.random()` in template | Different on each render | Seed from stable data or use `<ClientOnly>` |

---

## Debugging: Investigating Hydration Warnings

### Step 1: Read the warning

Vue warnings look like:
- `Hydration node mismatch` -- server rendered a different node type than client expects
- `Hydration children mismatch` -- server has fewer/more child nodes
- `Hydration class mismatch` -- class attributes differ
- `Hydration style mismatch` -- inline styles differ

The warning includes the component tree (e.g. `at <MyComponent> at <ParentPage>`).

### Step 2: Identify the component

The last component in the `at <...>` chain is where the mismatch lives. Open that file.

### Step 3: Search for conditional rendering

In the identified component, search for:
1. `v-if` with any of: `mounted`, `isAuthed`, `user`, `hydrated`, `isMobile`, browser API calls
2. `:style` or `:class` bindings that reference client-only state
3. `TransitionGroup` without a server fallback
4. Any `ref` initialized from `window`, `document`, `navigator`, `localStorage`

### Step 4: Apply the fix

- `v-if="mounted && ..."` -> `v-show="mounted && ..."`
- `:style="clientOnlyStyle"` -> guard with hydrated ref, return `undefined` on server
- `TransitionGroup` -> add `v-if="mounted"` with static fallback in `v-else`
- Responsive `v-if` -> replace with Tailwind responsive classes

### Step 5: Verify

- Hard-refresh the page (Cmd+Shift+R)
- Check the browser console for hydration warnings
- The warning should be gone; the UI should render without flicker

---

## Quick Decision Tree

```
Is the condition stable across server + client?
  (e.g., data from useAsyncData, route params, static props)
  YES -> v-if is fine
  NO  -> Does the element need to be in the DOM for layout?
    YES -> v-show
    NO  -> <ClientOnly> or definePageMeta({ ssr: false })
```
