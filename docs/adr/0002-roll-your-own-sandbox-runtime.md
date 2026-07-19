# 2. Spike: roll-your-own sandbox runtime for generated previews

Date: 2026-07-18

## Status

Accepted

## Context

Epic #43 defines the Lovable export / preview flow for a Build's generated
landing-page artifact. Plan A for that epic is a hosted sandbox provider
(Daytona-style, Vercel Sandbox, E2B-class) reached through a provider-neutral
sandbox workspace contract, tracked as issue #44: `create`, `writeFiles`,
`exec`, `exposePort`/`preview`, `readLogs`, `snapshot`/`export`, `destroy`.
Issue #44 is still open — there is no `SandboxAdapter` code in the repo yet,
so this ADR treats that contract shape (from #44's issue text) as the
comparison baseline, not as code that exists today.

The epic (#43) references a planned `docs/research/sandbox-runtime-options.md`
research note. That file was never created; this ADR supersedes it — the spike
verdict below is the self-hosted-sandbox research record for the epic.

This issue (#49) asks whether we should build our own sandbox isolation layer
instead of depending on a hosted provider, and asks for two things: a written
go/no-go decision, and a throwaway runnable prototype that proves out one
candidate self-hosted approach end to end (boot an isolated workspace, serve a
generated static artifact through it, tear it down).

The dev/test host for this spike is macOS (Darwin); CI is GitHub-hosted
Ubuntu. Firecracker and Kata Containers both require Linux + KVM, so neither
can be the runnable prototype backend on this host. That limitation is itself
a finding, not just an inconvenience: it means the only self-hosted backend
this team can prototype and iterate on locally, without provisioning a Linux
box, is a hardened OCI container runner (Docker) — and container isolation
shares the host kernel, which is a materially weaker isolation boundary than
a microVM. That gap matters directly for running untrusted, LLM-generated
code, which is what a production preview sandbox actually has to do.

## Comparison

| Approach | Isolation strength | Cold-start latency | Host requirements | Infra cost model | Operational burden | Migration risk vs #44 contract |
|---|---|---|---|---|---|---|
| **(a) Hosted adapter** (Daytona / Vercel Sandbox / E2B-class) — epic #43 Plan A | Provider-managed, typically microVM-backed | Low (provider-optimized, sub-second to a few seconds) | None — API call from anywhere | Per-second/per-minute usage billing | Provider owns patching, preview routing/TLS, quotas, log collection, orphan cleanup, capacity planning | None — this *is* the #44 contract's first implementation |
| **(b) Firecracker microVMs** | Hardware VM boundary (KVM) | Low once warmed (~100s of ms), but requires a jailer/orchestrator | Linux + KVM host required; cannot run on this team's macOS dev hosts | Fixed VM fleet (bare metal/EC2 metal) + ops time | We own patching, preview routing/TLS, quotas, log collection, orphan/leaked-VM cleanup, capacity planning | Low *if* wrapped as a #44 adapter — same seam as (a) |
| **(c) Kata Containers** | Hardware VM boundary (lightweight VM per container, OCI-compatible) | Higher than Firecracker (fuller VM boot), lower ops complexity than raw Firecracker | Linux + KVM host required; cannot run on this team's macOS dev hosts | Fixed VM fleet + ops time | Same categories as (b), somewhat lower since it speaks the OCI/CRI interface | Low *if* wrapped as a #44 adapter |
| **(d) Hardened OCI container runner** (prototyped here) | Shared kernel + seccomp/caps/read-only rootfs — no hardware VM boundary | Very low (plain `docker run`, ~1s) | Anywhere Docker runs, including this team's macOS dev hosts | Fixed host(s) + ops time; cheapest to start, no per-minute billing | Same ownership list as (b)/(c): routing/TLS, quotas, logs, cleanup, capacity | Low *if* wrapped as a #44 adapter, but **not sufficient alone** for untrusted server code (see Go/no-go criteria) |
| **(e) Kubernetes Agent Sandbox** (optional) | Depends on node runtime — gVisor/Kata-backed nodes give VM-like isolation, plain containerd nodes do not | Medium (pod scheduling + image pull overhead) | A Kubernetes cluster, plus a hardened node runtime to reach VM-grade isolation | Cluster + node fleet cost + ops time; heaviest control-plane overhead of the self-hosted options | Adds cluster operations (control plane, node pools, RBAC, network policy) on top of (b)/(c)'s list | Low *if* wrapped as a #44 adapter, but highest total operational surface of the options compared |

## Recommendation

**No-go for now.** Ship the hosted adapter first (epic #43 Plan A, issue #44's
contract + a hosted provider). Do not build a self-hosted sandbox runtime as
part of the current MVP push.

This costs nothing architecturally: because #44 defines a provider-neutral
sandbox workspace contract, a self-hosted runtime — Firecracker, Kata, or a
hardened container runner — would ship later as *just another adapter*
implementing the same `create` / `writeFiles` / `exec` / `exposePort` /
`preview` / `readLogs` / `snapshot` / `destroy` interface. The roll-your-own
path stays fully viable; it is simply not the fastest way to a working Build →
Launch packet flow today, and it adds 24/7 infrastructure ownership (Linux/KVM
hosts, preview routing/TLS, quotas, capacity planning) that a hosted provider
already solves.

## Go/no-go criteria

Revisit this decision when any of the following becomes true:

- **Cost crossover**: sustained hosted-sandbox spend exceeds the fully-loaded
  cost of running one dedicated Linux/KVM host plus roughly a day/month of
  engineer time to operate it.
- **Sustained volume**: preview traffic shifts from bursty (a handful of
  Builds exercising previews per day) to sustained, high-concurrency usage
  where per-minute hosted billing dominates the Build economics.
- **Provider limit blocks a requirement**: a hosted provider's session
  duration cap, region availability, egress policy, or lack of custom-runtime
  support blocks a concrete product requirement.
- **Provider deprecation or repricing**: the chosen hosted provider changes
  pricing or deprecates the feature we depend on, forcing a migration
  regardless of preference.

Even when one of the above triggers a "go," the isolation tier matters:

- A **container-only runner** (approach d, what this spike prototypes) is
  acceptable **only for trusted or fully static artifacts** — e.g. serving a
  generated static Lovable-ready landing-page export, which is exactly what
  this prototype does.
- **Running untrusted generated server code** self-hosted (arbitrary
  LLM-produced application code, not just a static export) requires the
  **microVM tier** (Firecracker or Kata), because shared-kernel container
  isolation is not a sufficient security boundary for arbitrary code
  execution. Choosing that tier raises the bar from "run Docker somewhere" to
  "we operate Linux/KVM hosts" — a materially larger commitment that should
  only be taken on once the criteria above are met.

## Risks

- **Cost**: trades hosted per-minute billing for engineer time (build,
  operate, and iterate on the runtime) plus fixed host/VM-fleet spend. Cheap
  to prototype (this spike), expensive to run correctly in production
  (patching, capacity planning, on-call).
- **Security**: the shared-kernel escape surface for container-only isolation
  is real (kernel CVEs, container-breakout bugs); self-hosting also adds
  resource-exhaustion risk (a generated artifact/process consuming host
  CPU/memory/disk) and network-egress risk (generated code reaching internal
  network or the open internet from inside the sandbox). The prototype's
  hardening flags (`--read-only`, `--cap-drop ALL`,
  `--security-opt no-new-privileges`, memory/CPU/pids limits) mitigate but do
  not eliminate this for the container tier; they do not apply to a microVM
  tier decision, which needs its own hardening review if triggered.
- **Operations**: self-hosting means we own preview routing/TLS termination,
  per-workspace quotas, log collection, orphaned-workspace cleanup, and
  capacity planning — all bundled into hosted-provider billing today. This is
  a 24/7 ownership commitment, not a one-time build cost.
- **Migration**: low, *conditional on the #44 contract holding*. If a future
  self-hosted adapter implements the same `create`/`writeFiles`/`exec`/
  `exposePort`/`preview`/`readLogs`/`snapshot`/`destroy` surface as the hosted
  adapter, nothing above that seam (Build orchestration, stage gating, launch
  packet assembly) needs to change. The risk is entirely in *how faithfully*
  a self-hosted adapter can implement that contract — the prototype's
  `run.sh` is evidence the container-runner approach maps onto it cleanly.

## Migration steps

Ordered steps for a future "go" decision, once a go/no-go criterion above is
met:

1. Land the #44 contract and its hosted adapter (epic #43 Plan A) — this is
   the seam every later step targets.
2. Stand up a dedicated Linux/KVM host (or host fleet) for the self-hosted
   runtime.
3. Implement a self-hosted adapter behind the same #44 contract — Firecracker
   (e.g. via Cloud Hypervisor / firecracker-containerd) or Kata Containers,
   selected based on the go/no-go criterion that triggered the revisit
   (untrusted server code → microVM tier is mandatory, not optional).
4. Add preview routing/TLS termination and workspace teardown reaping (a
   scheduled sweep for orphaned workspaces, mirroring what the hosted
   provider currently does for free).
5. Run the hosted and self-hosted adapters in parallel behind a feature flag,
   so a bad self-hosted rollout doesn't take down preview availability.
6. Cut individual Builds over to the self-hosted adapter incrementally.
7. Decommission the hosted adapter once the self-hosted path has proven
   reliable under real Build traffic.

The prototype's `run.sh` (see `scripts/spike/sandbox-prototype/`) labels each
step with the #44 contract method it exercises — `create`/`writeFiles`,
`exec`/`exposePort`, `preview`, `destroy` — as direct evidence that step 3
above is mechanically straightforward once a host is available.

Runnable proof: `scripts/spike/sandbox-prototype/` — see its README.

## Consequences

- The team proceeds with epic #43 Plan A (hosted adapter) without further
  spike work blocking it.
- The #44 contract's shape is validated end to end by a real (if minimal)
  implementation — the prototype — giving confidence the contract is
  implementable by more than one backend before any hosted adapter code is
  written.
- No self-hosted sandbox code ships to `packages/*`; this ADR and the
  throwaway prototype are the only artifacts of this spike.
- The explicit go/no-go criteria above mean revisiting this decision is a
  documented trigger check, not a fresh debate, the next time sandbox cost or
  a provider limitation comes up.
