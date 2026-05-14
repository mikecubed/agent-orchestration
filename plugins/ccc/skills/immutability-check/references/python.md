# Immutability Check — Python Language Reference

**Language**: Python | **Loaded by**: immutability-check/SKILL.md

---

## Mutation Idioms to Detect (IMMUT-1)

### List mutation methods

| Method | Behavior | Pure alternative |
|---|---|---|
| `list.append(x)` | mutates in place | `lst + [x]` or `[*lst, x]` |
| `list.extend(other)` | mutates in place | `lst + other` |
| `list.insert(i, x)` | mutates in place | `lst[:i] + [x] + lst[i:]` |
| `list.pop()` / `list.remove(x)` | mutates in place | reconstruct via slicing / filter |
| `list.sort()` | mutates in place | `sorted(lst)` |
| `list.reverse()` | mutates in place | `list(reversed(lst))` or `lst[::-1]` |
| `lst[i] = x` (parameter) | mutates in place | `[*lst[:i], x, *lst[i+1:]]` |

### Dict mutation

| Pattern | Pure alternative |
|---|---|
| `d[k] = v` (on parameter) | `{**d, k: v}` |
| `d.update(other)` | `{**d, **other}` |
| `del d[k]` | `{k2: v for k2, v in d.items() if k2 != k}` |
| `d.pop(k)` | same as `del` |
| `d.setdefault(k, x)` (parameter) | `{**d, k: d.get(k, x)}` |

### Set mutation

| Method | Alternative |
|---|---|
| `s.add(x)` | `s | {x}` |
| `s.discard(x)` / `s.remove(x)` | `s - {x}` |
| `s.update(other)` | `s | other` |

---

## Local Mutation Is Fine

```python
def accumulate(items: list[int]) -> int:
    total = 0
    for x in items:
        total += x        # ✅ local mutation
    return total

def build(items: list[Item]) -> Result:
    out: list[Item] = []
    for x in items:
        out.append(transform(x))   # ✅ out is local
    return Result(items=tuple(out))
```

The rule is: mutation of a value the caller passed in is the violation.
Mutation of a value the function constructed itself is fine.

---

## Default Argument Mutation Anti-Pattern

```python
def add(items, x, history=[]):    # ❌ mutable default — silent shared state
    history.append(x)
    return items + [x]
```

This is both IMMUT-1 and IMMUT-2: shared mutable state across calls.

---

## Shared Mutable State Across Concurrency (IMMUT-2)

| Pattern | Concern |
|---|---|
| Module-level mutable dicts/lists | races under threading / asyncio |
| Class-level mutable defaults | shared across instances |
| `global x` for state | almost always wrong |
| `contextvars.ContextVar` for true context propagation | acceptable when intentional |

`frozenset`, `tuple`, and frozen `@dataclass(frozen=True)` are safe.

---

## Field Reassignment After Construction (IMMUT-3)

```python
# FLAG:
order = Order()
order.id = order_id
order.customer = customer

# PASS:
order = Order(id=order_id, customer=customer, items=items)
```

`@dataclass(frozen=True)` and `NamedTuple` make IMMUT-3 a runtime error.
Pydantic `BaseModel` with `model_config = ConfigDict(frozen=True)` is the
modern equivalent.

---

## Python-Specific Aids

| Aid | What it gives you |
|---|---|
| `@dataclass(frozen=True)` | Hash + immutable instance |
| `typing.Final` / `typing.FrozenSet` | Type-level immutability hints |
| `types.MappingProxyType(d)` | Read-only view of a dict |
| `tuple` for sequences, `frozenset` for sets | Stdlib immutable collections |

---

## Tooling

| Tool | Rule |
|---|---|
| `ruff` `B006`, `B008` | Mutable default argument detection |
| `mypy --strict` with `typing.Final` | Surfaces module-level mutable state |
| `pylint` `W0102` | Mutable default arguments |
