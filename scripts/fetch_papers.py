#!/usr/bin/env python3
"""Fetch latest AI papers from arXiv API and save to data/papers.json."""

import requests
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import os

KEYWORDS = ["LLM", "RAG", "Agent", "Harness"]
MAX_RESULTS = 30
ARXIV_API = "http://export.arxiv.org/api/query"
NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}


def build_query(keywords):
    parts = [f'all:"{kw}"' for kw in keywords]
    return " OR ".join(parts)


def fetch_papers(keywords, max_results):
    query = build_query(keywords)
    params = {
        "search_query": query,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    }
    print(f"Querying arXiv: {query}")
    resp = requests.get(ARXIV_API, params=params, timeout=30)
    resp.raise_for_status()
    return parse_feed(resp.content, keywords)


def parse_feed(content, keywords):
    root = ET.fromstring(content)
    papers = []

    for entry in root.findall("atom:entry", NS):
        title_el = entry.find("atom:title", NS)
        summary_el = entry.find("atom:summary", NS)
        published_el = entry.find("atom:published", NS)
        updated_el = entry.find("atom:updated", NS)
        id_el = entry.find("atom:id", NS)

        if title_el is None or id_el is None:
            continue

        title = " ".join(title_el.text.split())
        summary = " ".join(summary_el.text.split()) if summary_el is not None else ""
        published = published_el.text if published_el is not None else ""
        updated = updated_el.text if updated_el is not None else ""
        arxiv_url = id_el.text.strip()
        arxiv_id = arxiv_url.split("/abs/")[-1]

        authors = [
            a.find("atom:name", NS).text
            for a in entry.findall("atom:author", NS)
            if a.find("atom:name", NS) is not None
        ]

        categories = [
            c.get("term", "") for c in entry.findall("atom:category", NS)
        ]

        text = (title + " " + summary).lower()
        matched = [kw for kw in keywords if kw.lower() in text]

        papers.append(
            {
                "id": arxiv_id,
                "title": title,
                "summary": summary,
                "authors": authors[:5],
                "published": published,
                "updated": updated,
                "url": arxiv_url,
                "categories": categories[:5],
                "matched_keywords": matched,
            }
        )

    return papers


def main():
    print(f"Fetching up to {MAX_RESULTS} papers for: {KEYWORDS}")
    papers = fetch_papers(KEYWORDS, MAX_RESULTS)

    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "keywords": KEYWORDS,
        "total": len(papers),
        "papers": papers,
    }

    os.makedirs("data", exist_ok=True)
    out_path = "data/papers.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(papers)} papers -> {out_path}")


if __name__ == "__main__":
    main()
