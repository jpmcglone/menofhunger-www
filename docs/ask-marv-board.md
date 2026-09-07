# Ask MARV board

Visual source: [Ask MARV in the UI Library](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=202-2).

- [Desktop dark](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=202-6129) and [light](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=202-6141).
- [iPhone dark](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=202-6153) and [light](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=202-6165).
- Masters: [composer](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=202-25), [ask states](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=202-6115), [action review](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=202-6128).
- Additional canvases cover empty, loading, unavailable, interrupted, and desktop/iPhone action review.

The composer is first in document order. Asks sort by `createdAt` descending without changing the received payload. The newest ask, running asks, and asks with pending proposals open by default; each can be expanded or collapsed. Refresh preserves explicit expansion choices. Sending does not scroll to the bottom.

The four existing suggested prompts remain available. They form two columns on small screens; native accessibility text uses one column. Source details and server-owned review snapshots remain attached to each ask. Applying and cancelling are separate explicit actions. Asking “yes” never approves a proposal. Unavailable MARV disables the composer while preserving saved asks and admin tools.

Web uses `AdminAssistantWorkspace.vue`, `AdminAssistantAsk.vue`, the existing safe Markdown renderer, and semantic surface/text/border variables. iOS uses native `AdminAssistantScreen`, composer, ask and review components, the existing MARV mark and semantic colors. Native Admin navigation supports older capability catalogs that still mark Assistant as a web destination. Dedicated admin tools remain authenticated web handoffs where no native tool exists.

Both clients reload on appearance/activation, reconnect, and admin invalidation, and discard results after account changes. Requests use stable UUIDs, explicit decisions, and no automatic paid-request retry. The iOS API client permits a 240-second assistant request without changing ordinary request timeouts.
