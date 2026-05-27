#!/usr/bin/env python3
"""Estimate spouse gender distribution from the spouse activities TSV file.

This script uses the `gender-guesser` package for first-name based inference,
and falls back to a few small French-specific hints when a first name is not
available or not recognized.

The output is JSON on stdout by default, with a short human-readable summary
printed to stderr.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import gender_guesser.detector as gender_detector

FEMALE_TITLE_HINTS = ("mme", "madame", "m me", "mme.")
MALE_TITLE_HINTS = ("m.", "mr", "monsieur", "m ")
FEMALE_JOB_HINTS = (
    "directrice",
    "présidente",
    "presidente",
    "gérante",
    "gerante",
    "responsable",
    "secrétaire",
    "secretaire",
    "avocate",
    "architecte",
    "conseillère",
    "conseillere",
    "consultante",
    "notaire",
    "pharmacienne",
    "médecin",
    "medecin",
    "professeure",
    "enseignante",
)
MALE_JOB_HINTS = (
    "directeur",
    "président",
    "president",
    "gérant",
    "gerant",
    "responsable",
    "secrétaire",
    "secretaire",
    "avocat",
    "architecte",
    "conseiller",
    "consultant",
    "notaire",
    "pharmacien",
    "médecin",
    "medecin",
    "professeur",
    "enseignant",
)


@dataclass(frozen=True)
class GenderCounts:
    female: int = 0
    male: int = 0
    unknown: int = 0

    @property
    def total(self) -> int:
        return self.female + self.male + self.unknown

    @property
    def female_percent(self) -> float:
        return (self.female / self.total * 100.0) if self.total else 0.0



def normalize_text(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()



def normalize_job_name(value: object) -> str:
    text = normalize_text(value)
    text = re.sub(r"\[Données non publiées\]", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    if text.lower() == "retraitée":
        return "Retraitée"
    return text



def is_empty_response_job(value: object) -> bool:
    normalized = normalize_job_name(value).lower()
    return normalized in {"néant", "neant", "non renseigné", "non renseigne"}



def infer_gender(row: dict[str, str], detector: gender_detector.Detector) -> str:
    joined = f"{row.get('conjoint_prenom', '')} {row.get('conjoint_nom', '')} {row.get('spouse_name', '')}".lower()
    if any(hint in joined for hint in FEMALE_TITLE_HINTS):
        return "female"
    if any(hint in joined for hint in MALE_TITLE_HINTS):
        return "male"

    activity = f"{row.get('activite_professionnelle', '')} {row.get('employeur_conjoint', '')}".lower()
    if any(hint in activity for hint in FEMALE_JOB_HINTS):
        return "female"
    if any(hint in activity for hint in MALE_JOB_HINTS):
        return "male"

    first_name = normalize_text(row.get("conjoint_prenom", ""))
    if first_name:
        guessed = detector.get_gender(first_name.split()[0])
        if guessed in {"female", "mostly_female"}:
            return "female"
        if guessed in {"male", "mostly_male"}:
            return "male"
        if guessed == "andy":
            return "unknown"

    return "unknown"



def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        return list(reader)



def analyze(rows: Iterable[dict[str, str]]) -> GenderCounts:
    detector = gender_detector.Detector(case_sensitive=False)
    counts = Counter()
    for row in rows:
        counts[infer_gender(row, detector)] += 1
    return GenderCounts(
        female=counts["female"],
        male=counts["male"],
        unknown=counts["unknown"],
    )



def main() -> int:
    parser = argparse.ArgumentParser(description="Estimate spouse gender distribution from a TSV file.")
    parser.add_argument("path", nargs="?", default="public/datasets/spouse_activities.tsv", help="Path to the TSV file")
    parser.add_argument("--json", action="store_true", help="Print compact JSON only")
    args = parser.parse_args()

    rows = load_rows(Path(args.path))
    counts = analyze(rows)

    result = {
        "path": str(Path(args.path)),
        "female": counts.female,
        "male": counts.male,
        "unknown": counts.unknown,
        "total": counts.total,
        "female_percent": round(counts.female_percent, 2),
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))

    print(
        f"Genre estimé: {counts.female_percent:.1f} % femmes · {counts.female} femmes · {counts.male} hommes · {counts.unknown} inconnus",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
