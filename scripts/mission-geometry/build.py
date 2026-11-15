"""Fetch two NASA/JPL vector tables, then optionally compare Siderust offline.

Network requests are sequential as required by the Horizons API usage policy.
The browser uses NASA data only. This script never changes game/save state.
"""
import argparse
import csv
import hashlib
import io
import json
import math
import re
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

AU_KM = 149_597_870.7
C_KM_S = 299_792.458
API = "https://ssd.jpl.nasa.gov/api/horizons.api"
DOC = "https://ssd-api.jpl.nasa.gov/doc/horizons.html"
DATES = [f"{year}-{month:02d}-01" for year in (2026, 2027) for month in range(1, 13)] + ["2028-01-01"]


def jd(date):
    # Calendar conversion only: these midnight dates are explicitly TDB, not UTC.
    return (datetime.fromisoformat(date) - datetime(2000, 1, 1, 12)).total_seconds() / 86400 + 2451545.0


def request_parameters(target):
    return {
        "format": "json", "COMMAND": f"'{target}'", "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'", "EPHEM_TYPE": "'VECTORS'", "CENTER": "'500@10'",
        "REF_PLANE": "'ECLIPTIC'", "REF_SYSTEM": "'ICRF'", "OUT_UNITS": "'AU-D'",
        "TIME_TYPE": "'TDB'", "TLIST_TYPE": "'JD'",
        "TLIST": "'" + " ".join(str(jd(date)) for date in DATES) + "'",
        "VEC_TABLE": "'1'", "VEC_CORR": "'NONE'", "CSV_FORMAT": "'YES'",
    }


def read_table(payload, target):
    if payload.get("error"):
        raise ValueError(f"Horizons error: {payload['error']}")
    if payload.get("signature", {}).get("version") not in ("1.2", "1.3"):
        raise ValueError("Horizons API changed: review its response contract before regenerating.")
    raw = payload.get("result", "")
    if raw.count("$$SOE") != 1 or raw.count("$$EOE") != 1:
        raise ValueError("Missing or repeated Horizons ephemeris delimiters")
    header = raw.split("$$SOE")[0]
    if f"({target})" not in header or "Sun (10)" not in header:
        raise ValueError("Wrong target or center returned by Horizons")
    if "JDTDB" not in header or "Ecliptic of J2000.0" not in header:
        raise ValueError("Unexpected time scale/reference plane")
    if not re.search(r"Output units\s*:\s*AU-D", header) or "GEOMETRIC cartesian states" not in header:
        raise ValueError("Unexpected units or vector correction")
    rows = []
    for row in csv.reader(io.StringIO(raw.split("$$SOE")[1].split("$$EOE")[0].strip())):
        if not row or not row[0].strip():
            continue
        rows.append({"jd_tdb": float(row[0]), "xyz_au": [float(x) for x in row[2:5]]})
    if len(rows) != len(DATES):
        raise ValueError(f"Expected {len(DATES)} samples, received {len(rows)}")
    for date, row in zip(DATES, rows):
        if abs(row["jd_tdb"] - jd(date)) > 1e-8 or len(row["xyz_au"]) != 3:
            raise ValueError("Sample epochs/components did not match request")
        if not all(math.isfinite(v) for v in row["xyz_au"]):
            raise ValueError("Non-finite vector")
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--offline", action="store_true", help="Read previously fetched NASA responses")
    parser.add_argument("--compare-siderust", action="store_true")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    args.evidence.mkdir(parents=True, exist_ok=True)
    tables, sources = {}, []
    for name, target in (("earth", "399"), ("mars", "499")):
        params = request_parameters(target)
        url = API + "?" + urlencode(params)
        path = args.evidence / f"horizons-{name}.json"
        if args.offline:
            cached = json.loads(path.read_text(encoding="utf-8"))
            if cached["parameters"] != params:
                raise ValueError("Cache request does not match current settings")
        else:
            with urlopen(Request(url, headers={"User-Agent": "Zhetalis-Educational-Mission-Geometry/1.0"}), timeout=60) as response:
                payload = json.load(response)
            read_table(payload, target)  # Never save an error as a valid response.
            cached = {"retrieved_at": datetime.now(timezone.utc).isoformat(), "url": url,
                      "parameters": params, "response": payload}
            path.write_text(json.dumps(cached, indent=2) + "\n", encoding="utf-8")
        tables[name] = read_table(cached["response"], target)
        sources.append({"body": name, "target_id": target, "retrieved_at": cached["retrieved_at"],
                        "request_url": url, "response_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "ephemeris": re.search(r"Target body name:[^\n]+\{source: ([^}]+)\}", cached["response"]["result"]).group(1),
                        "api_signature": cached["response"]["signature"]})

    samples = []
    for index, date in enumerate(DATES):
        earth, mars = tables["earth"][index], tables["mars"][index]
        distance_km = math.dist(earth["xyz_au"], mars["xyz_au"]) * AU_KM
        samples.append({"date": date, "jd_tdb": earth["jd_tdb"],
                        "earth_au": earth["xyz_au"], "mars_au": mars["xyz_au"],
                        "distance_km": distance_km, "one_way_radio_seconds": distance_km / C_KM_S})

    dataset = {
        "schema_version": 1,
        "title": "Earth-Mars mission radio: monthly NASA/JPL snapshots",
        "source": "NASA/JPL Horizons", "source_docs": DOC, "sources": sources,
        "conventions": {"epoch_scale": "TDB", "calendar_time": "00:00:00 TDB on each sample date",
                        "origin": "Sun center (10)", "bodies": "Earth center (399), Mars center (499)",
                        "plane": "J2000 ecliptic (ICRF reference system)", "position_unit": "au",
                        "distance_unit": "km", "au_km": AU_KM, "c_km_s": C_KM_S,
                        "corrections": "NONE: simultaneous geometric positions"},
        "limitations": ["Fixed monthly snapshots, not live telemetry or closest-approach dates.",
                        "Radio time is distance divided by c at one instant; moving-target light time is not solved.",
                        "Round-trip example doubles this estimate and excludes people, relays and network delays.",
                        "Line-of-sight blockage, solar conjunction and link availability are not modeled.",
                        "This is not a flight path, travel time, launch-window planner or terrain/shadow model.",
                        "Top-down diagram ignores z for display; numerical distance uses all three components."],
        "samples": samples,
    }
    (args.output / "earth-mars.json").write_text(json.dumps(dataset, indent=2) + "\n", encoding="utf-8")
    print(f"NASA: {len(samples)} snapshots written to {args.output}")

    if args.compare_siderust:
        from siderust import Body
        comparison = []
        for sample in samples:
            epoch = sample["jd_tdb"]
            earth = Body.Earth.heliocentric_position(epoch)
            mars = Body.Mars.heliocentric_position(epoch)
            calculated = earth.distance_to(mars) * AU_KM
            error = abs(calculated - sample["distance_km"])
            comparison.append({"date": sample["date"], "jd_input": epoch,
                               "nasa_distance_km": sample["distance_km"], "siderust_distance_km": calculated,
                               "absolute_difference_km": error})
        maximum = max(row["absolute_difference_km"] for row in comparison)
        report = {
            "siderust_version": version("siderust"), "tempoch_version": version("tempoch"),
            "siderust_license": "AGPL-3.0", "siderust_source": "https://github.com/Siderust/siderust-py",
            "method": "Body.Earth/Mars.heliocentric_position(jd).distance_to(): analytical VSOP87",
            "epoch_note": "The Python Body API accepts an untagged JulianDate. This comparison supplies the same TDB number as Horizons; it is not a strict time-scale conversion validation.",
            "scope": "Scalar distance check only, for rounded educational displays. No navigation accuracy claim.",
            "acceptance_km": 10000, "max_absolute_difference_km": maximum,
            "passed": maximum <= 10000, "samples": comparison,
        }
        (args.output / "siderust-validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"Siderust {version('siderust')}: maximum separation difference {maximum:.3f} km; pass={report['passed']}")
        if not report["passed"]:
            raise SystemExit("Siderust exceeds the educational-display tolerance; do not substitute it for NASA data.")


if __name__ == "__main__":
    main()
