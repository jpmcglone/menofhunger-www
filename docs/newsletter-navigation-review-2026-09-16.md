# Newsletter navigation

The sent newsletter had no content CTA because both optional CTA fields were empty.
The email shell's brand was plain text, and the footer only exposed notification settings.

The renderer now always includes:

- A linked **Men of Hunger** brand name leading to the configured site home.
- A default **Open Men of Hunger** button leading to `/home`, unless a complete custom CTA
  replaces it. The existing feed is browsable publicly; normal app authentication still applies.
- A permanent **Visit Men of Hunger** footer link, including when a custom CTA points elsewhere.
- Equivalent destinations in the plain-text message.

The newsletter button uses a 48px target: black with white text in light mode, white with
black text in dark mode, using the existing theme colors. Inline styles provide the light
fallback; supported dark-mode media rules and Outlook selectors invert both colors.
HTML without stylesheet support retains the existing light inline palette. Unsubscribe links,
notification settings, mailing address and List-Unsubscribe headers stay intact. The optional
brand link and larger button are requested by the newsletter renderer, so other email shells
retain their current presentation. Preview, immediate and scheduled sends use the same renderer.

Invalid or incomplete custom CTAs fall back to the default. Standard HTTP(S), email and telephone
custom destinations remain supported; relative paths resolve against the configured site origin.

Figma: [desktop](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=704-242),
[phone](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=704-244),
[dark](https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=704-251).

Validation: all 58 newsletter/email tests pass, including preview transport assertions and
monochrome light/dark rules. Changed-file lint, TypeScript, API build/module-graph checks
and admin coverage pass. Generated synthetic HTML reviewed in the browser
at phone and desktop widths, including its stylesheet-stripped light fallback and the final
white-on-black / black-on-white button styles. No email was sent.
Real Gmail, Outlook and Apple Mail inbox rendering was not exercised.

This is a template fix for deployment. Already delivered email cannot be rewritten in recipients'
inboxes. The previous newsletter was not edited, resent or duplicated.
