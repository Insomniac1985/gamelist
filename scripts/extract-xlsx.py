from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid5, NAMESPACE_URL
from zipfile import ZipFile
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "Games List.xlsx"
OUT = ROOT / "data" / "seed-games.json"

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

SECTIONS = {
    "Modern Games To Buy": "wanted",
    "Not out yet": "upcoming",
    "Backlog": "backlog",
}

TAG_COLUMNS = {
    "PREORDERED": "preordered",
    "BUY FROM PLAYASIA": "playasia",
    "DIGITAL": "digital",
    "FROM JORDI": "jordi",
    "FROM JUDY": "judy",
    "COOP": "coop",
}


def col_to_index(cell_ref: str) -> int:
    letters = re.match(r"([A-Z]+)", cell_ref).group(1)
    total = 0
    for char in letters:
        total = total * 26 + ord(char) - 64
    return total - 1


def excel_date(value: str) -> str:
    try:
        serial = float(value)
    except (TypeError, ValueError):
        return value or ""
    if 1900 <= serial <= 2100 and serial == int(serial):
        return str(int(serial))
    if serial < 1000:
        return value or ""
    return (datetime(1899, 12, 30) + timedelta(days=serial)).date().isoformat()


def read_shared_strings(zip_file: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []
    root = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall("a:si", NS):
        strings.append("".join(text.text or "" for text in item.findall(".//a:t", NS)))
    return strings


def read_sheet_rows(zip_file: ZipFile, path: str, shared: list[str]) -> list[list[str]]:
    root = ET.fromstring(zip_file.read(path))
    rows = []
    for row in root.findall("a:sheetData/a:row", NS):
        values: list[str] = []
        for cell in row.findall("a:c", NS):
            index = col_to_index(cell.attrib["r"])
            while len(values) <= index:
                values.append("")
            value_node = cell.find("a:v", NS)
            value = "" if value_node is None else value_node.text or ""
            if cell.attrib.get("t") == "s" and value:
                value = shared[int(value)]
            values[index] = value.strip() if isinstance(value, str) else value
        rows.append(values)
    return rows


def normalize_bool(value: str) -> bool:
    return bool(str(value or "").strip())


def normalize_hours(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def game_from_row(section: str, headers: list[str], subheaders: list[str], row: list[str], index: int) -> dict | None:
    name = (row[0] if len(row) > 0 else "").strip()
    platform = (row[1] if len(row) > 1 else "").strip()
    if not name:
        return None

    notes_col = headers.index("Notes") if "Notes" in headers else -1
    release_col = headers.index("Release Date") if "Release Date" in headers else -1
    tags = []
    owners = []
    preorder_store = ""
    preferred_store = ""

    for col, header in enumerate(headers):
        label = header or (subheaders[col] if col < len(subheaders) else "")
        value = row[col] if col < len(row) else ""
        tag = TAG_COLUMNS.get(label)
        if tag and normalize_bool(value):
            if tag in {"jordi", "judy"}:
                owners.append(tag.capitalize())
            else:
                tags.append(tag)
        if label == "PREORDERED" and normalize_bool(value):
            preorder_store = value
        if label == "BUY FROM PLAYASIA" and normalize_bool(value):
            preferred_store = "Playasia"

    notes = row[notes_col].strip() if notes_col >= 0 and notes_col < len(row) else ""
    if notes.upper() in {"XTRALIFE", "GAME", "AMAZON"}:
        preorder_store = notes.title()
    if "preorder" in notes.lower() and not preorder_store:
        preorder_store = notes
    if "scarce" in notes.lower():
        tags.append("scarce")
    if "waiting for physical" in notes.lower():
        tags.append("waiting physical")
    if "limited run" in notes.lower():
        preferred_store = "Limited Run"
    if "play-asia.com" in notes.lower():
        preferred_store = "Playasia"
        tags.append("import")
    if "to collect" in notes.lower():
        tags.append("to collect")

    release_date = ""
    release_text = ""
    if release_col >= 0 and release_col < len(row):
        release_text = row[release_col].strip()
        release_date = excel_date(release_text)
        if release_date == release_text and release_text:
            release_date = ""

    game_id = str(uuid5(NAMESPACE_URL, f"{name}|{platform}|{section}|{index}"))
    return {
        "id": game_id,
        "title": name,
        "platform": platform,
        "section": SECTIONS[section],
        "releaseDate": release_date,
        "releaseText": release_text if not release_date else "",
        "lengthHours": normalize_hours(row[2] if len(row) > 2 else ""),
        "notes": notes,
        "tags": sorted(set(tags)),
        "genres": [],
        "owners": owners,
        "preorderStore": preorder_store,
        "preferredStore": preferred_store,
        "cover": "",
        "prices": [],
        "order": index,
        "completedAt": "",
        "createdAt": "2026-06-09T00:00:00.000Z",
        "updatedAt": "2026-06-09T00:00:00.000Z",
    }


def main() -> None:
    games = []
    with ZipFile(XLSX) as zip_file:
        shared = read_shared_strings(zip_file)
        workbook = ET.fromstring(zip_file.read("xl/workbook.xml"))
        rels = ET.fromstring(zip_file.read("xl/_rels/workbook.xml.rels"))
        relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        for sheet in workbook.findall("a:sheets/a:sheet", NS):
            name = sheet.attrib["name"]
            if name not in SECTIONS:
                continue
            rid = sheet.attrib[f"{{{NS['r']}}}id"]
            target = relmap[rid]
            path = target if target.startswith("xl/") else f"xl/{target}"
            rows = read_sheet_rows(zip_file, path, shared)
            headers = rows[0]
            subheaders = rows[1] if len(rows) > 1 else []
            for i, row in enumerate(rows[2:]):
                game = game_from_row(name, headers, subheaders, row, i)
                if game:
                    games.append(game)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"games": games}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(games)} games to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
