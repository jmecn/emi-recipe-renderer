#!/usr/bin/env python3
"""One-off: copy guide-export (legacy paths) into emi/ bundle layout for emi-recipe-renderer demo."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

REPLACEMENTS_IN_JSON = (
    ("generated/recipes/layouts/", "recipes/layouts/"),
    ("generated/recipe-chrome/", "chrome/"),
    ("generated/recipe-textures/", "textures/"),
)


def canonical_registry_id(registry_id: str) -> str:
    """Plain id: drop SNBT `{...}` and export `namespace:path@nbtHash` suffix."""
    if not registry_id:
        return registry_id
    s = registry_id
    if "{" in s:
        s = s.split("{", 1)[0]
    if "@" in s:
        s = s.split("@", 1)[0]
    return s


def rewrite_json_text(text: str) -> str:
    for old, new in REPLACEMENTS_IN_JSON:
        text = text.replace(old, new)
    return text


def collect_item_ids_from_ingredient(ing: object, out: set[str]) -> None:
    if ing is None:
        return
    if isinstance(ing, str):
        raw = ing.strip()
        if raw.startswith("item:"):
            out.add(canonical_registry_id(raw[5:]))
        elif raw.startswith("#item:"):
            return
        elif ":" in raw and not raw.startswith("#"):
            out.add(canonical_registry_id(raw))
        return
    if isinstance(ing, list):
        for part in ing:
            collect_item_ids_from_ingredient(part, out)
        return
    if isinstance(ing, dict):
        kind = ing.get("type")
        if kind == "item" and ing.get("id"):
            out.add(canonical_registry_id(str(ing["id"])))
        elif kind == "fluid" and ing.get("id"):
            out.add(canonical_registry_id(str(ing["id"])))
        for entry in ing.get("entries") or []:
            if isinstance(entry, dict):
                if entry.get("ids"):
                    for i in entry["ids"]:
                        out.add(canonical_registry_id(str(i)))
                if entry.get("fluid", {}).get("id"):
                    out.add(canonical_registry_id(str(entry["fluid"]["id"])))


def build_items_index(
    layouts_dir: Path,
    recipe_ids: dict,
    recipes_by_output: dict | None,
) -> dict:
    inputs: dict[str, set[str]] = {}
    outputs: dict[str, set[str]] = {}

    for recipe_id, meta in recipe_ids.items():
        layout_path = layouts_dir / Path(str(meta.get("layout", "")).replace("recipes/layouts/", "")).name
        if not layout_path.is_file():
            safe = recipe_id.replace(":", "_").replace("/", "_")
            layout_path = layouts_dir / f"{safe}.json"
        if not layout_path.is_file():
            continue
        layout = json.loads(layout_path.read_text(encoding="utf-8"))
        for widget in layout.get("widgets") or []:
            role = widget.get("role")
            ing = widget.get("ingredient")
            ids: set[str] = set()
            if widget.get("tagDisplayItem"):
                ids.add(canonical_registry_id(str(widget["tagDisplayItem"])))
            collect_item_ids_from_ingredient(ing, ids)
            if not ids:
                continue
            bucket = outputs if role == "output" else inputs if role in ("input", "catalyst") else None
            if bucket is None:
                continue
            for item_id in ids:
                bucket.setdefault(item_id, set()).add(recipe_id)

    if recipes_by_output:
        for item_id, refs in recipes_by_output.items():
            canon = canonical_registry_id(item_id)
            for ref in refs:
                rid = ref.get("recipeId") if isinstance(ref, dict) else None
                if rid:
                    outputs.setdefault(canon, set()).add(rid)

    merged_inputs: dict[str, set[str]] = {}
    merged_outputs: dict[str, set[str]] = {}
    for item_id, recipe_set in inputs.items():
        canon = canonical_registry_id(item_id)
        merged_inputs.setdefault(canon, set()).update(recipe_set)
    for item_id, recipe_set in outputs.items():
        canon = canonical_registry_id(item_id)
        merged_outputs.setdefault(canon, set()).update(recipe_set)

    all_ids = set(merged_inputs) | set(merged_outputs)
    items = {}
    for item_id in sorted(all_ids):
        items[item_id] = {
            "inputs": sorted(merged_inputs.get(item_id, [])),
            "outputs": sorted(merged_outputs.get(item_id, [])),
        }
    return {"schema": 1, "itemCount": len(items), "items": items}


def copy_tree(src: Path, dst: Path) -> None:
    if not src.exists():
        print(f"skip missing: {src}")
        return
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    print(f"copied {src} -> {dst}")


def main() -> int:
    src_root = Path(sys.argv[1] if len(sys.argv) > 1 else "~/Downloads/guide-export").expanduser()
    dst_root = Path(sys.argv[2] if len(sys.argv) > 2 else "demo/emi").expanduser()
    if not src_root.is_dir():
        print(f"source not found: {src_root}", file=sys.stderr)
        return 1

    dst_root.mkdir(parents=True, exist_ok=True)

    copy_tree(src_root / "generated/recipes/layouts", dst_root / "recipes/layouts")
    copy_tree(src_root / "generated/recipe-textures", dst_root / "textures")
    copy_tree(src_root / "generated/recipe-chrome", dst_root / "chrome")
    copy_tree(src_root / "generated/icons", dst_root / "icons")
    copy_tree(src_root / "lang", dst_root / "lang")

    tag_src = src_root / "index/tag-members.json"
    tag_dst = dst_root / "tags/members.json"
    tag_dst.parent.mkdir(parents=True, exist_ok=True)
    if tag_src.is_file():
        tag_dst.write_text(tag_src.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"copied {tag_src} -> {tag_dst}")

    index_src = src_root / "generated/recipes/layouts-index.json"
    if not index_src.is_file():
        print(f"missing {index_src}", file=sys.stderr)
        return 1
    index_text = rewrite_json_text(index_src.read_text(encoding="utf-8"))
    index = json.loads(index_text)
    for entry in index.get("recipes", {}).values():
        if isinstance(entry, dict) and "layout" in entry:
            entry["layout"] = entry["layout"].replace("generated/recipes/layouts/", "recipes/layouts/")
    (dst_root / "recipes").mkdir(parents=True, exist_ok=True)
    (dst_root / "recipes/index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {dst_root / 'recipes/index.json'}")

    layouts_dir = dst_root / "recipes/layouts"
    if layouts_dir.is_dir():
        n = 0
        for path in layouts_dir.glob("*.json"):
            raw = path.read_text(encoding="utf-8")
            fixed = rewrite_json_text(raw)
            if fixed != raw:
                path.write_text(fixed, encoding="utf-8")
                n += 1
        print(f"rewrote paths in {n} layout files")

    lang_codes = sorted(p.stem for p in (dst_root / "lang").glob("*.json")) if (dst_root / "lang").is_dir() else ["en_us"]
    bundle = {
        "schema": 1,
        "layoutSchema": index.get("schema", 2),
        "scale": index.get("scale", 2),
        "defaultLanguage": "en_us",
        "languages": lang_codes,
        "recipeCount": len(index.get("recipes", {})),
    }
    (dst_root / "bundle.json").write_text(
        json.dumps(bundle, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {dst_root / 'bundle.json'} ({bundle['recipeCount']} recipes, {len(lang_codes)} languages)")

    rbo_src = src_root / "index/recipes-by-output.json"
    rbo_data = None
    if rbo_src.is_file():
        rbo_data = json.loads(rbo_src.read_text(encoding="utf-8")).get("entries", {})

    items_index = build_items_index(
        dst_root / "recipes/layouts",
        index.get("recipes", {}),
        rbo_data,
    )
    items_path = dst_root / "items/index.json"
    items_path.parent.mkdir(parents=True, exist_ok=True)
    items_path.write_text(json.dumps(items_index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {items_path} ({items_index['itemCount']} items with recipe links)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
