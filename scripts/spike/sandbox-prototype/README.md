# Sandbox runtime spike (issue #49)

**Throwaway spike code — not product code, will not be maintained.** It backs
the go/no-go decision recorded in
[`docs/adr/0002-roll-your-own-sandbox-runtime.md`](../../../docs/adr/0002-roll-your-own-sandbox-runtime.md).
It intentionally lives outside `apps/*`/`packages/*` so it adds nothing to the
repo's build/lint/test surface, is not wired into `scripts/verify.sh` or CI,
and has no `package.json` of its own.

## What this proves

A single self-verifying script (`run.sh`) boots one isolated sandbox
workspace using a hardened Docker container, serves a sample static
landing-page artifact through it on localhost, verifies the preview is
reachable and correct, then tears everything down and asserts the teardown
actually happened. Each step is labelled with the provider-neutral sandbox
workspace contract method (issue #44: `create`, `writeFiles`, `exec`,
`exposePort`/`preview`, `destroy`) it stands in for — that mapping is the
evidence cited in the ADR that a self-hosted adapter could implement the same
contract as a hosted provider.

## Prerequisites

- Docker (daemon running), with the `busybox:stable` image pullable.

## How to run

From the repo root:

```bash
./scripts/spike/sandbox-prototype/run.sh
```

## Expected output

The script prints one section per contract method (`preflight`,
`create/writeFiles`, `exec/exposePort`, `preview`, `destroy`), then:

```
✅ spike proof passed
```

and exits `0`. If any step fails, or the script is interrupted, an `EXIT`
trap force-removes the container and the temporary workspace directory so a
failed run never leaks a workspace — that's acceptance scenario 2 from the
issue.

## See also

[`docs/adr/0002-roll-your-own-sandbox-runtime.md`](../../../docs/adr/0002-roll-your-own-sandbox-runtime.md)
for the full comparison, recommendation, go/no-go criteria, risks, and
migration steps.
