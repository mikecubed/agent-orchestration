#!/usr/bin/env python3
"""
lint_dead_code.py — Unused export and orphaned file detector.

Requires: Python 3.12+

Usage:
    python3.12 scripts/lint_dead_code.py --path <directory>

Output (stdout): JSON with keys `unused_exports`, `orphaned_files`, `exit_code`.
Exit code: 0 = clean, 1 = violations found.

Supported languages: TypeScript, JavaScript, Python, Go, Rust.
"""

import argparse
import ast
import json
import os
import re
import sys
from pathlib import Path
from typing import NamedTuple

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


class ExportRef(NamedTuple):
    file: str
    line: int
    symbol: str


class OrphanRef(NamedTuple):
    file: str
    reason: str


# ---------------------------------------------------------------------------
# Language helpers
# ---------------------------------------------------------------------------

# File extensions → language
LANG_MAP = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
}

# Entry-point filename patterns (basename match)
ENTRY_POINT_BASENAMES = {
    "index.ts",
    "index.tsx",
    "index.js",
    "index.mjs",
    "main.ts",
    "main.js",
    "app.ts",
    "app.js",
    "server.ts",
    "server.js",
    "main.py",
    "__main__.py",
    "main.go",
    "main.rs",
    "lib.rs",
}

# Directories to always exclude
EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    "__pycache__",
    ".git",
    "target",
    ".venv",
    "venv",
    "env",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
}

# Test file patterns (these count as entry points for reachability)
TEST_PATTERNS = [
    re.compile(r"\.test\.[tj]sx?$"),
    re.compile(r"\.spec\.[tj]sx?$"),
    re.compile(r"^test_.*\.py$"),
    re.compile(r"_test\.go$"),
    re.compile(r"_test\.rs$"),
    re.compile(r"(?:^|/)tests/[^/]+\.rs$"),  # Rust integration tests in tests/
]


def is_test_file(path: Path) -> bool:
    # Match against the full path string so that path-based patterns like
    # (?:^|/)tests/[^/]+\.rs$ work correctly (basename alone lacks the separator).
    full = str(path)
    return any(p.search(full) for p in TEST_PATTERNS)


def _is_name(node: ast.AST, expected_id: str) -> bool:
    return isinstance(node, ast.Name) and node.id == expected_id


def _is_main_constant(node: ast.AST) -> bool:
    if isinstance(node, ast.Constant):
        return isinstance(node.value, str) and node.value == "__main__"
    return False


def _expr_is_main_guard(test: ast.expr) -> bool:
    """Return True if the expression represents a __name__ == '__main__' check,
    optionally combined with other conditions via boolean AND."""
    if (
        isinstance(test, ast.Compare)
        and len(test.ops) == 1
        and isinstance(test.ops[0], ast.Eq)
        and len(test.comparators) == 1
    ):
        left, right = test.left, test.comparators[0]
        return (_is_name(left, "__name__") and _is_main_constant(right)) or (
            _is_name(right, "__name__") and _is_main_constant(left)
        )
    if isinstance(test, ast.BoolOp) and isinstance(test.op, ast.And):
        return any(_expr_is_main_guard(value) for value in test.values)
    return False


def _contains_main_guard(source: str) -> bool:
    try:
        tree = ast.parse(source)
    except (SyntaxError, ValueError):
        return False
    for node in tree.body:
        if isinstance(node, ast.If) and _expr_is_main_guard(node.test):
            return True
    return False


def has_main_guard(path: Path) -> bool:
    """Return True if a Python file contains an if __name__ == '__main__': guard."""
    if path.suffix != ".py":
        return False
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return False
    return _contains_main_guard(source)


def is_entry_point(path: Path) -> bool:
    return path.name in ENTRY_POINT_BASENAMES or is_test_file(path) or has_main_guard(path)


def collect_source_files(root: Path) -> list[Path]:
    """Walk root and return all source files, excluding EXCLUDE_DIRS."""
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune excluded directories in-place
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            if p.suffix in LANG_MAP:
                files.append(p)
    return files


# ---------------------------------------------------------------------------
# Export extraction per language
# ---------------------------------------------------------------------------


def extract_exports_typescript(path: Path) -> list[tuple[int, str]]:
    """Return (line, symbol) for each exported declaration in a TS/JS file."""
    results = []
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    # export function/class/const/let/var/type/interface/enum Name
    decl_re = re.compile(
        r"^export\s+(?:default\s+)?(?:async\s+)?"
        r"(?:function\*?|class|const|let|var|type|interface|enum)\s+"
        r"([A-Za-z_$][A-Za-z0-9_$]*)"
    )
    # export { Name, Name2 }
    named_re = re.compile(r"^export\s*\{([^}]+)\}")
    # export default Name  (identifier, not expression)
    default_re = re.compile(r"^export\s+default\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*;?$")

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        m = decl_re.match(stripped)
        if m:
            results.append((i, m.group(1)))
            continue
        m = named_re.match(stripped)
        if m:
            for sym in m.group(1).split(","):
                sym = sym.strip().split(" as ")[0].strip()
                if sym and re.match(r"^[A-Za-z_$]", sym):
                    results.append((i, sym))
            continue
        m = default_re.match(stripped)
        if m:
            results.append((i, m.group(1)))
    return results


def extract_exports_python(path: Path) -> list[tuple[int, str]]:
    """Return (line, symbol) for public (non-underscore) top-level definitions."""
    results = []
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(path))
    except SyntaxError:
        return results

    # Check for __all__ — if present, only those names are public
    all_names: list[str] | None = None
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == "__all__" for t in node.targets
        ):
            if isinstance(node.value, (ast.List, ast.Tuple)):
                all_names = [
                    elt.value  # ast.Constant.value (replaces deprecated .s)
                    for elt in node.value.elts
                    if isinstance(elt, ast.Constant) and isinstance(elt.value, str)
                ]
            break

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            name = node.name
            if all_names is not None:
                if name in all_names:
                    results.append((node.lineno, name))
            elif not name.startswith("_"):
                results.append((node.lineno, name))
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    name = target.id
                    if all_names is not None:
                        if name in all_names:
                            results.append((node.lineno, name))
                    elif not name.startswith("_") and name.isupper():
                        # Only flag module-level UPPER_CASE constants as exports
                        results.append((node.lineno, name))
    return results


def extract_exports_go(path: Path) -> list[tuple[int, str]]:
    """Return (line, symbol) for exported (PascalCase) top-level Go declarations."""
    results = []
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    # func/type/var/const ExportedName
    decl_re = re.compile(r"^(?:func|type|var|const)\s+([A-Z][A-Za-z0-9_]*)")
    for i, line in enumerate(lines, start=1):
        m = decl_re.match(line.strip())
        if m:
            results.append((i, m.group(1)))
    return results


def extract_exports_rust(path: Path) -> list[tuple[int, str]]:
    """Return (line, symbol) for `pub` items in a Rust file."""
    results = []
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    pub_re = re.compile(
        r"^pub(?:\([^)]*\))?\s+(?:async\s+)?(?:fn|struct|enum|trait|type|const|static|mod)\s+"
        r"([a-zA-Z_][a-zA-Z0-9_]*)"
    )
    for i, line in enumerate(lines, start=1):
        m = pub_re.match(line.strip())
        if m:
            results.append((i, m.group(1)))
    return results


def get_exports(path: Path) -> list[tuple[int, str]]:
    lang = LANG_MAP.get(path.suffix, "")
    if lang in ("typescript", "javascript"):
        return extract_exports_typescript(path)
    if lang == "python":
        return extract_exports_python(path)
    if lang == "go":
        return extract_exports_go(path)
    if lang == "rust":
        return extract_exports_rust(path)
    return []


# ---------------------------------------------------------------------------
# Import / reference extraction (for usage checking)
# ---------------------------------------------------------------------------


def collect_all_symbol_references(files: list[Path]) -> set[str]:
    """
    Cheap heuristic: collect every identifier-shaped token that appears in
    any import/use/require statement across all files. Used to check whether
    a symbol is referenced anywhere.
    """
    refs: set[str] = set()

    import_ts = re.compile(r"import\s+(?:type\s+)?\{([^}]+)\}|import\s+(\w+)")
    from_py = re.compile(r"from\s+\S+\s+import\s+(.+)")
    import_py = re.compile(r"^import\s+(\S+)")
    use_rs = re.compile(r"use\s+(?:\w+::)*\{?([A-Za-z_][A-Za-z0-9_,\s]*)\}?")

    for path in files:
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        lang = LANG_MAP.get(path.suffix, "")

        if lang in ("typescript", "javascript"):
            for m in import_ts.finditer(text):
                group = m.group(1) or m.group(2) or ""
                for sym in re.split(r"[\s,]+", group):
                    sym = sym.strip().split(" as ")[0].strip()
                    if sym:
                        refs.add(sym)
            # Also scan full text for any usage of symbols (broad net)
            for sym in re.findall(r"\b([A-Za-z_$][A-Za-z0-9_$]*)\b", text):
                refs.add(sym)

        elif lang == "python":
            for m in from_py.finditer(text):
                for sym in re.split(r"[\s,]+", m.group(1)):
                    sym = sym.strip().split(" as ")[0].strip()
                    if sym:
                        refs.add(sym)
            for m in import_py.finditer(text):
                refs.add(m.group(1).split(".")[0])
            for sym in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\b", text):
                refs.add(sym)

        elif lang == "go":
            for sym in re.findall(r"\b([A-Z][A-Za-z0-9_]*)\b", text):
                refs.add(sym)

        elif lang == "rust":
            for m in use_rs.finditer(text):
                for sym in re.split(r"[\s,]+", m.group(1)):
                    sym = sym.strip()
                    if sym:
                        refs.add(sym)
            for sym in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\b", text):
                refs.add(sym)

    return refs


# ---------------------------------------------------------------------------
# Import graph for orphan detection
# ---------------------------------------------------------------------------


def collect_imports(path: Path) -> set[str]:
    """
    Return set of raw import specifiers from a file (used to build adjacency).
    """
    imports: set[str] = set()
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return imports

    lang = LANG_MAP.get(path.suffix, "")

    if lang in ("typescript", "javascript"):
        for m in re.finditer(r"""(?:import|from)\s+['"]([^'"]+)['"]""", text):
            imports.add(m.group(1))
        for m in re.finditer(r"""require\(['"]([^'"]+)['"]\)""", text):
            imports.add(m.group(1))

    elif lang == "python":
        for m in re.finditer(r"from\s+(\S+)\s+import|^import\s+(.+)", text, re.MULTILINE):
            spec = m.group(1) or m.group(2) or ""
            # Handle comma-separated imports: `import os, sys, helper`
            for token in re.split(r"[\s,]+", spec):
                token = token.strip()
                if token:
                    imports.add(token)

    elif lang == "go":
        for m in re.finditer(r'"([^"]+)"', text):
            imports.add(m.group(1))

    elif lang == "rust":
        for m in re.finditer(r"\bmod\s+(\w+)\s*;", text):
            imports.add(m.group(1))

    return imports


def resolve_import_to_file(specifier: str, importer: Path, all_files: list[Path]) -> Path | None:
    """
    Best-effort: resolve an import specifier to one of the known source files.
    Handles relative paths and attempts index-file resolution.
    """
    lang = LANG_MAP.get(importer.suffix, "")

    if lang in ("typescript", "javascript"):
        if not specifier.startswith("."):
            return None  # node_modules — ignore
        base = (importer.parent / specifier).resolve()
        # Try exact match with extensions
        for ext in (".ts", ".tsx", ".js", ".jsx", ".mjs"):
            candidate = base.with_suffix(ext)
            if candidate in set(all_files):
                return candidate
        # Try index file
        for ext in (".ts", ".tsx", ".js", ".jsx"):
            candidate = base / f"index{ext}"
            if candidate in set(all_files):
                return candidate

    elif lang == "python":
        # Convert dotted module path to relative file path
        parts = specifier.lstrip(".").replace(".", "/")
        if not parts:
            return None
        for root_candidate in all_files:
            candidate = root_candidate.parent / f"{parts}.py"
            if candidate in set(all_files):
                return candidate
            candidate = root_candidate.parent / parts / "__init__.py"
            if candidate in set(all_files):
                return candidate

    elif lang == "rust":
        # mod name; → name.rs or name/mod.rs
        candidate_a = importer.parent / f"{specifier}.rs"
        candidate_b = importer.parent / specifier / "mod.rs"
        files_set = set(all_files)
        if candidate_a in files_set:
            return candidate_a
        if candidate_b in files_set:
            return candidate_b

    return None


def build_reachable_set(all_files: list[Path], entry_points: frozenset[Path]) -> set[Path]:
    """
    BFS from all entry points through the import graph. Returns the set of
    reachable files.
    """
    visited: set[Path] = set(entry_points)
    queue: list[Path] = list(entry_points)

    while queue:
        current = queue.pop()
        for specifier in collect_imports(current):
            resolved = resolve_import_to_file(specifier, current, all_files)
            if resolved and resolved not in visited:
                visited.add(resolved)
                queue.append(resolved)

    return visited


# ---------------------------------------------------------------------------
# Main analysis
# ---------------------------------------------------------------------------


def analyse(root: Path) -> tuple[list[ExportRef], list[OrphanRef]]:
    all_files = collect_source_files(root)

    if not all_files:
        return [], []

    # --- Unused exports ---
    # Build a single in-memory content map to avoid O(files × exports × file_size)
    # disk reads. Each file is read at most once.
    content_map: dict[Path, str] = {}
    for f in all_files:
        try:
            content_map[f] = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            content_map[f] = ""

    # Precompute entry points once using the already-read content_map so
    # has_main_guard() doesn't re-read and re-parse each Python file.
    entry_points: frozenset[Path] = frozenset(
        f
        for f in all_files
        if f.name in ENTRY_POINT_BASENAMES
        or is_test_file(f)
        or (f.suffix == ".py" and _contains_main_guard(content_map[f]))
    )

    unused_exports: list[ExportRef] = []

    for path in all_files:
        if path in entry_points:
            continue  # entry points (scripts, tests) are never scanned for unused exports
        for line, symbol in get_exports(path):
            pattern = re.compile(r"\b" + re.escape(symbol) + r"\b")
            found = any(pattern.search(content_map[other]) for other in all_files if other != path)
            if not found:
                unused_exports.append(
                    ExportRef(
                        file=str(path),
                        line=line,
                        symbol=symbol,
                    )
                )

    # --- Orphaned files ---
    reachable = build_reachable_set(all_files, entry_points)
    orphaned_files: list[OrphanRef] = []

    for path in all_files:
        if path in entry_points:
            continue  # entry points are never orphans by definition
        if path.suffix == ".go":
            continue  # Go packages are compiled by directory; import-graph BFS
            # can't resolve absolute module paths, causing false positives
        if path not in reachable:
            orphaned_files.append(
                OrphanRef(
                    file=str(path),
                    reason="Not reachable from any entry point via import graph",
                )
            )

    return unused_exports, orphaned_files


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect unused exports and orphaned files.",
    )
    parser.add_argument(
        "--path",
        required=True,
        help="Root directory to analyse (respects --scope from conductor).",
    )
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        print(
            json.dumps(
                {
                    "error": f"Path does not exist: {root}",
                    "unused_exports": [],
                    "orphaned_files": [],
                    "exit_code": 1,
                }
            )
        )
        return 1

    unused_exports, orphaned_files = analyse(root)

    exit_code = 1 if (unused_exports or orphaned_files) else 0

    output = {
        "unused_exports": [
            {"file": e.file, "line": e.line, "symbol": e.symbol} for e in unused_exports
        ],
        "orphaned_files": [{"file": o.file, "reason": o.reason} for o in orphaned_files],
        "exit_code": exit_code,
    }

    print(json.dumps(output, indent=2))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
