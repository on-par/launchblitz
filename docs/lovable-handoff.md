# Lovable-ready handoff (format v1)

The Lovable-ready handoff is a deterministic markdown document generated from a
Build's Launch packet, meant to be pasted directly into Lovable's build prompt
to hand off a founder's approved LaunchBlitz work. It is produced by
`buildLovableHandoff` in `packages/workflow/src/lovable-handoff.ts`, a pure
function of the `LaunchPacket` assembled by `assembleLaunchPacket`.

## Version marker

Every generated document contains the line:

```
<!-- launchblitz-lovable-handoff v1 -->
```

The number matches `LOVABLE_HANDOFF_FORMAT_VERSION`. Any breaking change to the
block order, section-inclusion rule, or content-rendering rules below bumps
`LOVABLE_HANDOFF_FORMAT_VERSION` and this marker together.

## Block order

The markdown is emitted as a sequence of blocks joined by blank lines, ending
in a single trailing newline:

1. `# Lovable Build Handoff` — top-level heading.
2. `<!-- launchblitz-lovable-handoff v1 -->` — the version marker.
3. An intro paragraph telling the founder to paste the whole document into
   Lovable's build prompt and to regenerate after approving more stages.
4. One block group per **approved** Launch packet section, in the canonical
   `LAUNCH_PACKET_SECTIONS` order:
   - `## {section title}`
   - `_Approved {approvedAt}_` (the section's ISO approval timestamp)
   - the section's rendered content (see below)
5. If any sections are not yet approved, a final `## Pending sections` block
   naming them and pointing back at LaunchBlitz to approve and regenerate.

## Section inclusion rule

Only sections with `status === "approved"` in the assembled `LaunchPacket` are
rendered. Sections with status `"draft"` or `"missing"` are never rendered —
their titles are only listed under `## Pending sections`. This mirrors
`packet.missingSections` exactly, so a section is either fully in the document
or fully out of it; there is no partial/draft rendering. As with the packet
assembler, an approved section's content prefers `editedOutput` over
`rawOutput`.

## Content rendering

A section's `content` is `Record<string, unknown> | null`:

- `null` renders as the single line `_No content captured for this section._`.
- Otherwise each `[key, value]` entry is rendered in insertion order as a
  `**{key}**` label followed by the value:
  - string values are emitted as-is.
  - any other value is emitted as a fenced block using
    ` ```json ` containing `JSON.stringify(value, null, 2)`.

## Pending sections block

When `pendingSections` (mirrors `packet.missingSections`) is non-empty, the
document ends with:

```
## Pending sections

Not yet approved and not included: {titles joined with ", "}. Regenerate this
handoff after approving them in LaunchBlitz.
```

## Regeneration semantics

`buildLovableHandoff` is a pure function of its `LaunchPacket` input — it has
no side effects, timestamps, or randomness beyond the packet's own
`approvedAt` values. Two calls on identical packet input always produce
byte-identical markdown. The handoff page
(`apps/web/app/(dashboard)/dashboard/builds/[id]/packet/lovable/page.tsx`) is a
server component with no caching directives, so every visit re-fetches the
current stage-output records and rebuilds the handoff — that revisit *is* the
regeneration flow. There is no persisted or versioned handoff record; the
document always reflects the Build's current approvals.

## Stability promise

Format v1 is frozen as documented above. Any future change to block order,
the section-inclusion rule, or content rendering is a breaking change and
must bump `LOVABLE_HANDOFF_FORMAT_VERSION` (and the `<!-- launchblitz-lovable-handoff
vN -->` marker) rather than silently changing v1's output.
