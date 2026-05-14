# Result Check — Python Language Reference

**Language**: Python | **Loaded by**: result-check/SKILL.md
**RESULT-1 severity in Python**: WARN

Exceptions are conventional in Python. The rule does not push core code
toward `Result<T, E>` style at all costs — it asks for typed exception
hierarchies and explicit catch sites. Python core that raises typed,
domain-specific exceptions and catches them at the boundary is idiomatic
and passes the rule.

---

## Acceptable Patterns

### Option A: typed exception hierarchy + explicit boundary catch

```python
class DomainError(Exception): ...
class OrderNotFound(DomainError): ...
class InvalidAmount(DomainError): ...

def charge(amount: Money, card: Card) -> Receipt:
    if amount.value <= 0:
        raise InvalidAmount(amount)
    ...

# Caller at boundary:
try:
    receipt = charge(amount, card)
except InvalidAmount as e:
    return reject(e)
```

This satisfies the *spirit* of RESULT-1 in Python: failures are typed and
catchable, the exception type names the failure mode.

### Option B: explicit `Result` type via `returns`

```python
from returns.result import Result, Success, Failure

def charge(amount: Money, card: Card) -> Result[Receipt, ChargeError]:
    if amount.value <= 0:
        return Failure(ChargeError.invalid_amount(amount))
    return Success(receipt)
```

Acceptable if the codebase has adopted `returns` or a similar typed-error
library. Don't force this onto a codebase that uses idiomatic exceptions.

---

## RESULT-1 Patterns to Flag (WARN)

| Pattern | Concern |
|---|---|
| `raise Exception(...)` (bare) for a domain failure | Use a typed subclass |
| `raise ValueError("order not found")` | Should be `raise OrderNotFound(order_id)` |
| Functions raising `Exception` without a documented hierarchy | Callers can't tell what's possible |
| Mixed `return None` and `raise` for the same condition | Pick one |

---

## Allowed Raises (Not RESULT-1)

| Pattern | Why allowed |
|---|---|
| `assert` for invariant checks (in debug builds) | Internal precondition |
| `raise NotImplementedError(...)` in abstract methods | Genuinely unreachable when subclass overrides |
| `raise RuntimeError("unreachable")` in `else` of an exhaustive `match` | Assertion of completeness |

---

## `None` for Not-Found (RESULT-2)

```python
# FLAG — implicit None:
def find_order(id: OrderId) -> Order:    # missing Optional
    ...
    return None

# PASS — explicit Optional:
def find_order(id: OrderId) -> Optional[Order]: ...

# BETTER — explicit Result:
def find_order(id: OrderId) -> Result[Order, NotFound]: ...
```

Python's `Optional[T]` is the conventional missing-value type. Flag only
when the signature lies (returns `None` from a function annotated `-> T`).

---

## Silently Swallowed Errors (RESULT-3)

```python
# FLAG:
try:
    do_risky()
except Exception:
    pass

# FLAG:
try:
    ...
except:                       # bare except — also a linting violation
    pass

# PASS — intentional with reason:
try:
    invalidate_cache(key)
except CacheMissError:
    pass  # cache miss is expected; downstream fetch will rebuild
```

A bare `pass` with a comment explaining intent is acceptable. A bare `pass`
with no comment is the failure mode.

---

## Python-Specific Aids

| Aid | What it gives you |
|---|---|
| Typed exception hierarchy with `Exception` base | Catchable, namable failures |
| `__cause__` / `__context__` chaining via `raise X from Y` | Preserves diagnostic chain |
| `enum.Enum` for error tags inside a result | Type-system enforcement |
| `pydantic.ValidationError` for input boundary failures | Strong typing for free |

---

## Tooling

| Tool | Rule |
|---|---|
| `ruff` `BLE001` | Catches `except Exception` / bare except |
| `ruff` `TRY*` rules | Push toward typed exception hierarchies |
| `pylint` `W0702`, `W0703` | Broad-except detection |
| `mypy --strict` | Surfaces `Optional[T]` mismatch with `None` returns |
