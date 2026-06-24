import json
import argparse
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://ur.arizona.edu"
SEARCH_URL = f"{BASE_URL}/find/search-ua-researchers"
OUTPUT_FILE = Path("public/data/uofa_research_opportunities.json")


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def slug_from_url(url: str) -> str:
    return url.rstrip("/").split("/")[-1]


def split_tags(value: str) -> list[str]:
    if not value:
        return []
    return [clean_text(item) for item in re.split(r",|\n", value) if clean_text(item)]


def field_text(soup: BeautifulSoup, field_name: str) -> str:
    field = soup.select_one(f".field--name-{field_name}")
    if not field:
        return ""

    label = field.select_one(".field__label")
    if label:
        label.extract()

    return clean_text(field.get_text(" ", strip=True))


def field_items(soup: BeautifulSoup, field_name: str) -> list[str]:
    field = soup.select_one(f".field--name-{field_name}")
    if not field:
        return []

    items = field.select(".field__item")
    if items:
        return [clean_text(item.get_text(" ", strip=True)) for item in items if clean_text(item.get_text(" ", strip=True))]

    text = field_text(soup, field_name)
    return [text] if text else []


def fetch_soup(session: requests.Session, url: str) -> BeautifulSoup:
    response = session.get(url, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def parse_rows(soup: BeautifulSoup) -> Iterable[dict]:
    for row in soup.select("table tbody tr"):
        cells = row.select("td")
        if len(cells) < 7:
            continue

        profile_link = cells[0].select_one("a[href]")
        department_link = cells[1].select_one("a[href]")
        profile_url = urljoin(BASE_URL, profile_link["href"]) if profile_link else ""
        department_url = urljoin(BASE_URL, department_link["href"]) if department_link else ""

        yield {
            "id": slug_from_url(profile_url) if profile_url else clean_text(cells[0].get_text(" ", strip=True)).lower().replace(" ", "-"),
            "name": clean_text(cells[0].get_text(" ", strip=True)),
            "profile_url": profile_url,
            "department": clean_text(cells[1].get_text(" ", strip=True)),
            "department_url": department_url,
            "offering_opportunity": clean_text(cells[2].get_text(" ", strip=True)),
            "opportunity_types": split_tags(clean_text(cells[3].get_text(", ", strip=True))),
            "prerequisites": clean_text(cells[4].get_text(" ", strip=True)),
            "research_location": clean_text(cells[5].get_text(", ", strip=True)),
            "end_date": clean_text(cells[6].get_text(" ", strip=True)),
        }


def parse_profile(session: requests.Session, opportunity: dict) -> dict:
    if not opportunity.get("profile_url"):
        return opportunity

    soup = fetch_soup(session, opportunity["profile_url"])
    title_items = field_items(soup, "field-az-titles")
    email_link = soup.select_one(".field--name-field-az-email a[href^='mailto:']")
    phone = field_text(soup, "field-az-phones")
    office = field_text(soup, "field-az-address")

    opportunity_types = field_items(soup, "field-ur-types") or opportunity["opportunity_types"]
    research_locations = field_items(soup, "field-ur-research-location")

    opportunity.update(
        {
            "title": title_items[0] if title_items else "",
            "titles": title_items,
            "email": clean_text(email_link.get_text(" ", strip=True)) if email_link else "",
            "phone": phone,
            "office": office,
            "description": field_text(soup, "field-ur-description"),
            "start_date": field_text(soup, "field-ur-research-start-date"),
            "end_date": field_text(soup, "field-ur-research-end-date") or opportunity["end_date"],
            "college": field_text(soup, "field-ur-imported-college"),
            "department": field_text(soup, "field-ur-primary-department") or opportunity["department"],
            "affiliated_departments": field_items(soup, "field-ur-affiliated-departments"),
            "majors_considered": field_text(soup, "field-ur-majors"),
            "opportunity_types": opportunity_types,
            "research_locations": research_locations,
            "research_location": ", ".join(research_locations) if research_locations else opportunity["research_location"],
        }
    )

    return opportunity


def discover_last_page(soup: BeautifulSoup) -> int:
    pages = [0]
    for link in soup.select(".pagination a[href*='page=']"):
        match = re.search(r"[?&]page=(\d+)", link.get("href", ""))
        if match:
            pages.append(int(match.group(1)))
    return max(pages)


def scrape_research_opportunities(include_profiles: bool = False) -> list[dict]:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Gradlae research opportunity scraper (student discovery project; contact via arizona.edu source site)",
        }
    )

    first_page = fetch_soup(session, SEARCH_URL)
    last_page = discover_last_page(first_page)
    opportunities: list[dict] = []

    for page in range(last_page + 1):
        url = SEARCH_URL if page == 0 else f"{SEARCH_URL}?page={page}"
        soup = first_page if page == 0 else fetch_soup(session, url)

        for opportunity in parse_rows(soup):
            if opportunity["offering_opportunity"].lower() != "yes":
                continue
            opportunities.append(opportunity)

        print(f"Scraped page {page + 1}/{last_page + 1}: {len(opportunities)} active opportunities", flush=True)

    if include_profiles:
        for index, opportunity in enumerate(opportunities, start=1):
            try:
                parse_profile(session, opportunity)
            except Exception as exc:
                print(f"Could not fetch profile for {opportunity['name']}: {exc}", flush=True)
            if index % 25 == 0:
                print(f"Fetched {index}/{len(opportunities)} profile pages", flush=True)
            time.sleep(0.1)

    opportunities.sort(key=lambda item: (item.get("department", ""), item.get("name", "")))
    return opportunities


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape University of Arizona undergraduate research opportunities.")
    parser.add_argument(
        "--include-profiles",
        action="store_true",
        help="Also visit every professor profile page for descriptions, contact info, majors, and colleges. This is slower.",
    )
    args = parser.parse_args()

    opportunities = scrape_research_opportunities(include_profiles=args.include_profiles)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": SEARCH_URL,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "count": len(opportunities),
        "opportunities": opportunities,
    }
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(opportunities)} research opportunities to {OUTPUT_FILE}", flush=True)


if __name__ == "__main__":
    main()
