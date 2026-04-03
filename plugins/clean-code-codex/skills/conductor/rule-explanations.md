# Clean Code Codex — Rule Explanations

Plain-language explanations for every rule in the Clean Code Codex.
Loaded on demand only: when `--explain` is active or a single RULE-ID is requested.

---

## TDD-1

When a developer writes implementation code before a test exists, there is no way to know
when the code is finished or whether it actually solves the right problem. The resulting code
tends to be hard to test after the fact because its structure was never shaped by testability
concerns. Writing the test first forces you to define the expected behaviour in concrete,
executable terms before a single line of implementation exists.
This rule prevents shipping untested logic that silently breaks when requirements change.

## TDD-2

Once a failing test is green, there is a strong temptation to keep adding "useful" behaviour
to the implementation while you have the file open. That extra code has no test coverage,
no specification, and no reason to exist yet — it is speculative complexity. Every line beyond
the minimum needed to pass the current tests must wait for a test that demands it.
This rule prevents accumulating untested, speculative code that inflates maintenance cost
without delivering verified value.

## TDD-3

Refactoring while tests are red means changing the structure of code whose correctness is
already in question. You cannot tell whether a new failure is caused by your refactor or by
the original bug you were trying to fix. Always restore the green state first, then improve
the design from a known-good baseline.
This rule prevents introducing structural regressions that are indistinguishable from the
original defect.

## TDD-4

A test named `test1`, `checkStuff`, or `verifyOk` communicates nothing about what scenario
it covers or what outcome it expects. When the test fails in CI, a developer must read the
entire test body to understand what broke. The pattern `[subject]_[scenario]_[expected]`
makes the failure self-describing in the test report without opening the file.
This rule prevents opaque test failures that waste time during incident investigation.

## TDD-5

When implementation is written before an interface is defined, the interface ends up shaped
by implementation details rather than by caller needs. Callers then depend on accidental
characteristics that can change at any time. Defining the interface first forces a clean
separation between the contract (what) and the mechanism (how).
This rule prevents interfaces that leak implementation details and create hidden coupling
between modules.

## TDD-6

Assertions like `assertTrue(result)` or `toBeTruthy()` pass for any truthy value — an empty
string, a non-null object, the number 1 — regardless of whether the actual value is correct.
A test with a weak assertion is nearly useless because it can pass even when the code
produces wrong output. Meaningful assertions check the exact value or structure you expect.
This rule prevents false-confidence test suites where tests pass despite incorrect behaviour.

## TDD-7

Mocking the domain layer to test domain logic replaces the real business rules with
simplified stubs. When the stub diverges from the real implementation — which it always
eventually does — the tests pass while the actual business behaviour is broken. Domain logic
must be tested through its real implementation, not through a simplified double.
This rule prevents test suites that give green results while production domain behaviour
is incorrect.

## TDD-8

A test that checks only one specific input can miss entire classes of bugs that only appear
at boundaries or with unusual data. Entities with invariants (e.g., "balance must never be
negative") need property-based tests that generate hundreds of random inputs to probe those
invariants automatically. Hand-written examples alone are not sufficient coverage for data
with non-trivial constraints.
This rule prevents invariant violations that only manifest with inputs the developer
didn't think to test by hand.

## TDD-9

When the test-to-code ratio falls significantly below 1:1, it signals that implementation
is outpacing verification. Each untested line is a liability that silently accumulates
until a refactor or bug reveals it. Monitoring the ratio across the codebase makes it
visible before it becomes a crisis.
This rule prevents the gradual erosion of test coverage that leaves large portions of a
codebase unverified.

---

## ARCH-1

When domain layer code imports from the infrastructure layer (databases, HTTP clients, ORMs),
business logic becomes coupled to delivery mechanisms. Swapping a database engine or
migrating to a new HTTP library then requires changes throughout the domain, which should
be the most stable part of the system. The domain must express business rules in terms of
abstractions, never in terms of concrete infrastructure components.
This rule prevents business logic that cannot be tested or evolved without also changing
infrastructure wiring.

## ARCH-2

When a high-level module directly instantiates a low-level module (e.g., `new MySQLRepository()`
inside a service), the service is permanently bound to that specific implementation. Testing
the service requires a real MySQL database; replacing MySQL requires editing the service.
Depending on an abstraction (interface or protocol) lets the caller decide which implementation
to inject at runtime.
This rule prevents high-level business logic from becoming untestable and unportable due
to hard-coded dependencies on concrete implementations.

## ARCH-3

A module with multiple reasons to change — say, one that handles user authentication,
formats email notifications, and manages billing — must be modified whenever any of those
concerns change. Each change risks breaking the others, and the blast radius of every edit
grows over time. A module with a single responsibility changes for exactly one reason
and can be understood, tested, and deployed in isolation.
This rule prevents cascading breakages caused by unrelated changes sharing the same
module.

## ARCH-4

When module A imports module B and module B imports module A, neither can be loaded,
tested, or compiled independently. Circular dependencies are a symptom of missing
abstractions — some concept that both modules share has not been extracted into its own
module. Circular graphs also break tree-shaking, incremental compilation, and dependency
analysis tooling.
This rule prevents modules that cannot be independently deployed, tested, or compiled
due to mutual dependency cycles.

## ARCH-5

When one bounded context directly calls internal types or functions of another bounded
context, a change in the internal details of the first context breaks the second silently.
Bounded contexts must communicate through published interfaces (events, APIs, shared
kernels) — never through internal references. This is the primary architectural mechanism
for keeping large systems evolvable.
This rule prevents internal implementation changes in one bounded context from
unexpectedly breaking a different part of the system.

## ARCH-6

Infrastructure concerns — SQL queries, HTTP client setup, file I/O, environment variable
reads — belong in the infrastructure layer. When these leak into the domain or application
layer, business logic becomes entangled with delivery details that should be swappable.
A domain object that reads from `process.env` directly cannot be reused in a different
deployment environment without modification.
This rule prevents business logic and application orchestration from becoming
non-portable due to embedded infrastructure concerns.

---

## TYPE-1

The `any`, `Any`, and `interface{}` types disable all type-checking for the values they
annotate. Code that accepts or returns `any` passes the type checker regardless of what
is actually stored at runtime, so type mismatches only surface as panics or runtime errors
in production. Every use of these escape hatches silently erodes the guarantees that
static typing is supposed to provide.
This rule prevents runtime type errors in code where the type system should have caught
the mistake at compile time.

## TYPE-2

Casting a value to a specific type without first verifying the value is actually of that
type can cause a panic or silent data corruption at runtime. An assertion that fails at
runtime in a production path produces an unhandled crash. Type assertions must be guarded
by a runtime check (type switch, ok-pattern, isinstance, etc.) so failures are handled
intentionally.
This rule prevents unguarded runtime panics caused by incorrect type assumptions.

## TYPE-3

A function that may return `null` or `undefined` without declaring it in its return type
forces every caller to guess whether they need to handle the absent case. When a caller
doesn't realise a null is possible — because the type signature doesn't mention it —
a null-dereference crash appears in production rather than as a compile-time error.
This rule prevents null-dereference crashes caused by callers who were not warned by the
type signature that an absent value was possible.

## TYPE-4

A switch or if-chain that handles only some variants of a union or enum will silently
do nothing — or worse, do the wrong thing — when a new variant is added. Exhaustive
handling, enforced by the type system (e.g., `never` assertion, `assert_never`, or
compiler warning), turns an omission into a compile-time error.
This rule prevents silent no-ops and incorrect default behaviour when new enum or union
variants are added without updating all switch sites.

## TYPE-5

Generic functions or types without constraints can be called with any type argument,
including types that don't support the operations the generic body relies on. The result
is either a compile error deep inside library code that is hard to trace, or a runtime
failure. Explicit constraints document the requirements and produce clear, early errors.
This rule prevents confusing deep-stack type errors caused by generic code receiving
type arguments that don't satisfy its implicit requirements.

## TYPE-6

When a variable typed as a specific interface or concrete type is reassigned to a value
of a wider type, the compiler's ability to track the variable's type narrows. Subsequent
code that relies on the specific type must use unsafe casts, and the narrower type information
is permanently lost. Each variable should have the most specific type that correctly
describes all values it will hold.
This rule prevents loss of type-system guarantees caused by variables that drift to
overly-wide types through assignment.

---

## NAME-1

Names like `data`, `info`, `result`, `temp`, `x`, or `foo` tell the reader nothing about
what a variable holds or what role it plays. Developers must read the surrounding code
to infer meaning, which multiplies the cognitive load of every code review or bug fix.
Revealing names make the intent of code self-evident without requiring comments or
mental mapping.
This rule prevents code that requires deciphering rather than reading, slowing down
every future maintenance task.

## NAME-2

A single-character name outside a trivial loop index provides no information about
purpose. When a bug occurs in a function full of single-letter variables, a debugger
or log statement produces output like `i=3, j=7, k=null` with no indication of what
those values represent in the problem domain. Meaningful names survive extraction into
logs, error messages, and stack traces.
This rule prevents opaque debugging sessions where variable names provide no clue about
the domain concept they represent.

## NAME-3

A function named `getUser` that also updates a last-access timestamp violates the caller's
expectation established by the `get` prefix. Callers who believe `get` is side-effect-free
will call it in read-only contexts, in caches, or in loops — and silently trigger mutations
they didn't intend. Similarly, `isValid` returning a non-boolean causes confusion in
conditional expressions.
This rule prevents silent unintended side effects caused by callers trusting naming
conventions that the implementation violates.

## NAME-4

When different parts of the codebase use `customer` in one place and `client` in another
for the same concept, developers must constantly context-switch to remember which term
applies where. Inconsistent vocabulary also makes text-search less reliable: searching
for `customer` misses all the `client` references. Domain vocabulary must match the
language of the business stakeholders.
This rule prevents confusing codebases where the same domain concept has multiple
names, making search, onboarding, and communication unreliable.

## NAME-5

Abbreviations like `usr`, `cfg`, `mgr`, or `req` save a few keystrokes at write time
but cost comprehension on every subsequent read. Not all abbreviations are universal —
`usr` might mean `user` or `usurp` depending on context — and abbreviations from one
developer's background may be opaque to another's. Modern IDEs provide auto-complete,
so the typing cost of full words is negligible.
This rule prevents ambiguity and comprehension delays caused by abbreviations that are
not universally understood by all team members.

## NAME-6

A variable named `admin`, `loggedIn`, or `valid` forces the reader to infer its type and
semantics from context. The prefix `is`, `has`, `can`, or `should` immediately communicates
that the value is boolean, which changes how readers interpret expressions like
`if (active)` vs. `if (isActive)`. The explicit prefix also prevents booleans from being
mistaken for objects or counts.
This rule prevents boolean variables that are mistaken for non-boolean types, leading
to incorrect conditional logic and confusing code.

## NAME-7

A function named `userProcess`, `data`, or `handler` describes a noun or vague concept
instead of an action. Functions are verbs — they do things — and a name like `processUser`,
`fetchData`, or `handleRequest` sets clear expectations about what will happen when the
function is called. Noun-form function names frequently signal that the function is doing
too many things or has unclear responsibility.
This rule prevents functions with ambiguous names that make it impossible to understand
what they do without reading their entire body.

---

## SIZE-1

A function longer than 20 lines typically contains multiple levels of abstraction mixed
together: high-level orchestration, low-level data manipulation, and error handling all
in one place. Reading it requires holding the entire body in working memory at once.
Short functions that do one thing at one level of abstraction are easier to name, test,
and reuse.
This rule prevents functions that are too large to understand, test, or safely modify
in isolation.

## SIZE-2

A file longer than 200 lines is almost always doing more than one thing. Large files
create merge conflicts, slow down code review (reviewers give up reading before the end),
and make it hard to find the code you're looking for. Each file should represent a single
coherent concept or module.
This rule prevents files that are too large to review effectively, leading to missed
bugs and poor separation of concerns.

## SIZE-3

A function with more than 3 parameters is difficult to call correctly: callers must
remember the order, type, and meaning of each argument. With 4 or more parameters,
swapping two arguments of the same type is a common and hard-to-spot bug. Grouping
related parameters into a named object makes call sites self-documenting and swap-safe.
This rule prevents incorrect argument ordering and hard-to-read call sites caused by
functions with too many individual parameters.

## SIZE-4

Code nested 4 or more levels deep requires the reader to track multiple simultaneous
conditions — the branch, the inner branch, the inner-inner branch, and the current loop —
all at once. This is the source of many off-by-one errors and missed boundary conditions.
Early-return ("guard clause") patterns and extraction into smaller functions eliminate
deep nesting without sacrificing correctness.
This rule prevents logic errors and missed edge cases caused by deeply nested code that
exceeds human working memory limits.

## SIZE-5

A boolean flag parameter like `processUser(user, true)` forces every caller to wonder
"what does `true` mean here?" The flag almost always means the function is doing two
different things and should be split into two named functions. Named functions are
self-documenting at the call site; flag parameters require looking up the function
signature every time.
This rule prevents confusing call sites where boolean arguments have no self-evident
meaning, hiding two distinct behaviours behind a single function name.

## SIZE-6

A class with more than 10 public methods is likely serving multiple clients with different
needs, which means it has multiple reasons to change. Large public APIs are harder to mock
in tests, harder to document accurately, and harder to evolve without breaking callers.
Interface segregation — splitting large interfaces into focused ones — keeps each class
aligned with a single role.
This rule prevents bloated classes whose large public surface area signals mixed
responsibilities and causes unnecessary coupling in callers.

---

## DEAD-1

Unused variables, imports, and exports add noise to every file that contains them. They
suggest to readers that a concept is needed when it isn't, potentially causing confusion
about dependencies. They also inflate bundle sizes in compiled targets and trigger linter
warnings that obscure real problems.
This rule prevents code rot caused by accumulating unused symbols that mislead
maintainers and inflate build artefacts.

## DEAD-2

Code after a `return` or `throw` statement can never execute. Its presence suggests either
a logic error (the developer meant to return later) or leftover code from a refactor that
wasn't cleaned up. Either way, it is misleading: readers expect that code in a function
body is reachable.
This rule prevents confusing dead code paths that indicate either a bug or incomplete
cleanup after a refactor.

## DEAD-3

Commented-out code communicates "this might be needed again" without any context about
why it was removed or when it will be restored. It clutters files, is never updated when
surrounding code changes, and gradually becomes wrong and confusing. Version control
preserves history — code that is no longer active should be deleted, not commented out.
This rule prevents commented-out code that misleads maintainers about what is active
and pollutes files with outdated, decaying history.

## DEAD-4

A TODO or FIXME without a ticket is an untracked promise that has no owner, no due date,
and no way to be discovered in a project management system. After 30 days, the context
that motivated the comment has often been forgotten by its author. Linking every TODO to
a ticket creates accountability and makes it findable in the work queue.
This rule prevents untracked technical debt that silently ages in the codebase without
anyone being accountable for resolving it.

## DEAD-5

Copy-paste duplication means that a bug fix, a requirement change, or a security patch
must be applied in multiple places. When one copy is updated and another is forgotten,
the codebase enters an inconsistent state that is difficult to discover without a
comprehensive audit. The duplicated logic should be extracted into a single shared
function or module.
This rule prevents inconsistent behaviour caused by the same logic existing in multiple
places that diverge over time as only some copies receive updates.

---

## TEST-1

Assertions like `toBeTruthy()`, `assertTrue(x)`, or `assert x` pass for any truthy value
regardless of its actual content. A test that only checks truthiness cannot distinguish
correct output from a non-null placeholder, a non-empty string, or the number 1. Specific
value assertions make the intent of each test unambiguous and ensure tests fail when
behaviour changes.
This rule prevents tests that pass despite incorrect output, creating a false sense of
coverage.

## TEST-2

Domain logic is the core of the application — the part that changes most often and
carries the most business risk. If domain layer coverage is below 90%, large sections
of business rules are exercised only by end-to-end tests or by real users in production.
Both of those feedback loops are too slow and too expensive to be the primary safety net
for domain correctness.
This rule prevents domain bugs from reaching production because the domain layer lacks
sufficient automated test coverage to catch regressions quickly.

## TEST-3

The application layer orchestrates use cases and coordinates domain objects. At 80%
coverage, the majority of use-case paths are verified; below that threshold, entire
workflows may be untested. Application-layer bugs typically manifest as incorrect data
flowing between components, which is exactly what integration-style tests at this layer
are designed to catch.
This rule prevents workflow-level bugs in the application layer that are invisible
because use-case paths are not covered by automated tests.

## TEST-4

Entities with invariants (e.g., "an order total must equal the sum of its line items")
have behaviour that must hold across an infinite range of possible inputs. Hand-crafted
example tests can only cover a finite number of cases and will miss edge cases that
property-based generators find routinely. Generators explore the input space far more
thoroughly than any manually written suite.
This rule prevents invariant violations that only appear with unusual inputs that
developers did not think to include in their hand-written test cases.

## TEST-5

A unit test that takes longer than 100 ms is a unit test that developers skip during
local development. Slow tests discourage frequent test runs, which means code is tested
less often and regressions are discovered later. Unit tests must be fast enough to be
run on every save without breaking the development flow.
This rule prevents slow test suites that developers stop running locally, eliminating
the fast feedback loop that makes TDD effective.

## TEST-6

A unit test that performs file I/O, network calls, or database queries is no longer a
unit test — it is an integration test with unit test labelling. These tests are slow,
flaky (network timeouts, missing fixtures), and environment-dependent. Unit tests must
isolate the logic under test from all external systems using in-memory doubles.
This rule prevents slow, flaky tests that fail for infrastructure reasons rather than
because the code under test is broken.

## TEST-7

The most common defects cluster at boundaries: the first element, the last element, the
empty collection, the zero value, the maximum integer, and the null input. A test suite
that only covers the "happy path" with typical data will miss the majority of real-world
defects. Every function that accepts a variable-length or nullable input must be tested
at its boundaries.
This rule prevents boundary-condition bugs — the most common class of production defect —
from reaching users because the test suite only exercises typical inputs.

## TEST-8

The ratio of test code to implementation code is a leading indicator of coverage health.
When implementation grows significantly faster than the test suite, it signals that new
code is being written without corresponding tests. Monitoring this ratio across commits
makes the drift visible before coverage metrics degrade to a problematic level.
This rule prevents gradual coverage erosion that only becomes visible when a major
regression occurs in code that was never properly tested.

## TEST-9

A mutation score below 60% means more than 40% of code mutations — injected bugs —
are not caught by the test suite. The tests technically run and pass, but they don't
actually verify the logic they claim to cover. Mutation testing exposes tests that
assert existence but not correctness, and it is the most reliable way to measure true
test effectiveness.
This rule prevents superficially passing test suites that fail to detect actual defects
because assertions are too weak to distinguish correct code from mutated (buggy) code.

---

## SEC-1

Hardcoded secrets, API keys, passwords, or tokens in source code are committed to version
control, which persists them in history even after removal. They are visible to everyone
with read access to the repository — including contributors, CI systems, and attackers who
gain access to the repo. Secrets must be injected at runtime via environment variables or
a secrets manager, never embedded in code.
This rule prevents credential exposure through version control history, which cannot
be fully remediated without a complete secret rotation.

## SEC-2

Environment variables are the primary mechanism for injecting configuration into
applications, but they are strings that can be absent, malformed, or set to unexpected
values. Using them without validation means configuration errors manifest as cryptic
runtime failures rather than a clear startup error. Schema validation at boot time
catches misconfigured environments before they affect users.
This rule prevents hard-to-diagnose runtime failures caused by missing or malformed
environment variable values that were never validated.

## SEC-3

`dangerouslySetInnerHTML`, `innerHTML`, and `eval` inject raw strings into the DOM or
JavaScript runtime. When any part of that string originates from user input, external
data, or a database, an attacker can inject malicious scripts — a cross-site scripting
(XSS) attack. Even indirect paths (data from a "safe" API that was itself compromised)
are sufficient to trigger XSS.
This rule prevents cross-site scripting vulnerabilities that allow attackers to execute
arbitrary JavaScript in the context of authenticated users.

## SEC-4

Constructing SQL queries by concatenating user-controlled strings allows an attacker
to inject SQL syntax that changes the query's meaning — `'; DROP TABLE users; --` being
the canonical example. Parameterized queries (prepared statements) treat all parameters
as data, never as SQL syntax, making injection structurally impossible regardless of
what the user submits.
This rule prevents SQL injection attacks that can expose, corrupt, or destroy all data
accessible to the database user.

## SEC-5

`Math.random()` and `Date.now()` produce values that are predictable given knowledge
of the algorithm or timing. Using them to generate session tokens, password reset links,
or cryptographic keys creates values that an attacker can predict or brute-force. The
platform's cryptographic random number generator (`crypto.randomBytes`, `secrets.token_hex`,
etc.) produces output that is computationally infeasible to predict.
This rule prevents the use of predictable "random" values in security-sensitive contexts
where predictability allows attackers to forge tokens or bypass authentication.

## SEC-6

Logging a user's password, credit card number, social security number, or access token
creates a persistent plaintext record in log files, log aggregation services, and
monitoring dashboards — all of which have much weaker access controls than the secrets
store. Even "temporary" debug logs often end up in long-lived log archives. Sensitive
fields must be masked or omitted before any log statement is emitted.
This rule prevents accidental exfiltration of sensitive user data through log pipelines
that were never designed to protect secrets.

## SEC-7

When user-controlled input is passed directly to `exec`, `spawn`, `subprocess.run`,
or a shell interpolation like `` `rm -rf ${input}` ``, an attacker who controls the
input string can inject shell metacharacters to execute arbitrary commands on the server.
This is a command injection vulnerability. All external command inputs must be passed
as argument arrays (never interpolated strings) and validated against a strict allowlist.
This rule prevents command injection attacks that give attackers arbitrary code execution
on the server running the application.

---

## DEP-1

A dependency with a known CVE is a documented, publicly disclosed vulnerability that
attackers actively scan for. Continuing to use it means the application inherits that
vulnerability. CVE databases (NVD, OSV, GitHub Advisory) publish exploitability ratings
and patch availability; staying current means known vulnerabilities are addressed before
they are exploited.
This rule prevents known, documented vulnerabilities from remaining in the dependency
tree where they can be exploited by attackers targeting the published CVE.

## DEP-2

Dependencies that are more than two major versions behind the current release are
typically missing security patches, performance improvements, and bug fixes that
accumulated across those major versions. Major version gaps also make future migrations
more expensive because breaking changes compound. Staying within two major versions
keeps upgrade paths manageable and security posture current.
This rule prevents the dependency debt that makes future security upgrades prohibitively
expensive because too many breaking changes have accumulated.

## DEP-3

Unresolved peer dependency conflicts cause package managers to install unexpected versions
of shared dependencies. The actual version installed at runtime may differ between
environments — local, CI, and production — producing bugs that are impossible to reproduce
consistently. Peer dependency conflicts must be resolved explicitly to ensure deterministic
installs.
This rule prevents environment-specific bugs caused by non-deterministic dependency
resolution when peer conflicts are left unresolved.

## DEP-4

A lock file (`package-lock.json`, `yarn.lock`, `Cargo.lock`, `go.sum`) pins exact
dependency versions so that every install — local, CI, and production — uses identical
trees. Without a committed lock file, `npm install` can silently upgrade a transitive
dependency between the time a developer tested locally and the time production deploys,
introducing an untested version.
This rule prevents version drift between environments that introduces defects or
vulnerabilities in production that were not present during local development or CI.

## DEP-5

Directly importing an internal module of a transitive dependency (one not listed in your
own `dependencies`) creates a dependency on an internal API that the package author never
committed to keeping stable. Those APIs can change or disappear in patch releases. The
solution is to list the dependency explicitly and use its public API only.
This rule prevents unexpected breakage when a transitive dependency removes or
restructures an internal module that you were relying on directly.

---

## OBS-1

An empty catch block — `catch (e) {}` — silently swallows every error that hits it.
The system continues running, but in an unknown state. Operators have no visibility into
the failure, no ability to diagnose it, and no way to know how often it occurs. Every
caught error must be either logged, rethrown to a higher handler, or explicitly recovered
with a documented strategy.
This rule prevents silent error swallowing that makes production failures invisible to
operators and impossible to diagnose from logs.

## OBS-2

External calls (HTTP, database, message queue, third-party API) can hang indefinitely
if the remote system is slow or unresponsive. Without a timeout, one slow dependency
can exhaust all available threads or connections and take down the entire service.
Without retry logic, transient failures (network blips, momentary overload) cause
user-visible errors that could have been transparently resolved.
This rule prevents cascading service outages caused by slow external dependencies
that exhaust resources because no timeout was set.

## OBS-3

Log statements built from string concatenation — `log.Info("user " + userId + " failed")`
— are unstructured text that is hard to parse, query, or alert on in a log aggregation
system. Structured logging (passing fields as key-value pairs to the logger) makes every
log record queryable, filterable, and machine-readable without regex parsing.
This rule prevents unstructured logs that are expensive to search and impossible to
aggregate into metrics without custom parsing pipelines.

## OBS-4

An error message that says only "record not found" or "operation failed" provides no
context for diagnosing why it failed. When operators receive an alert, they need to know
which operation failed, which entity was involved, and (where safe) which user triggered
it. Errors without context require log diving and source-code reading to diagnose —
which is expensive during an incident.
This rule prevents time-wasting incident investigations caused by error messages that
omit the context needed to identify the root cause quickly.

## OBS-5

A silent failure — a deferred function that discards an error, a goroutine that exits
without logging, a promise rejection that is caught and ignored — means the system
appears healthy while something is broken. The failure only becomes visible when a
downstream effect surfaces, by which point the root cause is long gone from memory and
logs. Every failure path must produce an observable signal.
This rule prevents failures that are invisible to monitoring systems, allowing problems
to compound undetected until they produce a much larger, harder-to-diagnose outage.
