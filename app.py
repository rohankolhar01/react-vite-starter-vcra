"""
Hello Crime POC — Flask app for Catalyst AppSail
"""
import sys
sys.path.insert(0, './lib')

import os
import re
import time
import logging
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, make_response

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("poc")

app = Flask(__name__)





_token_cache = {"access_token": None, "expires_at": 0}
_datastore_token_cache = {"access_token": None, "expires_at": 0}


def get_access_token(refresh_token_env="ZOHO_REFRESH_TOKEN", cache=None):
    """Get a cached access token, refreshing it via the given refresh-token env var if needed."""
    if cache is None:
        cache = _token_cache

    if cache is _token_cache:
        manual = os.getenv("CATALYST_ACCESS_TOKEN")
        if manual:
            return manual

    # Fall back to the general refresh token if a scope-specific one isn't configured.
    refresh_token = os.getenv(refresh_token_env) or os.getenv("ZOHO_REFRESH_TOKEN")
    client_id = os.getenv("ZOHO_CLIENT_ID")
    client_secret = os.getenv("ZOHO_CLIENT_SECRET")
    accounts_url = os.getenv("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.in")

    if not (refresh_token and client_id and client_secret):
        log.warning("No token config found.")
        return None

    now = time.time()
    if cache["access_token"] and cache["expires_at"] > now + 300:
        return cache["access_token"]

    try:
        resp = requests.post(
            f"{accounts_url}/oauth/v2/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token")
        expires_in = data.get("expires_in", 3600)
        cache["access_token"] = token
        cache["expires_at"] = now + expires_in
        log.info(f"Refreshed access token ({refresh_token_env}), expires in {expires_in}s")
        return token
    except Exception as e:
        log.error(f"Token refresh failed: {e}")
        return None


def _zcql(query):
    """Run a raw ZCQL query against the project and return the row list."""
    project_id = os.getenv("QUICKML_PROJECT_ID", "45860000000013025")
    token = get_access_token("ZOHO_DATASTORE_REFRESH_TOKEN", _datastore_token_cache)
    org = os.getenv("QUICKML_ORG_ID")

    if not token or not org:
        log.warning("Data Store: token/org missing")
        return []

    url = f"https://api.catalyst.zoho.in/baas/v1/project/{project_id}/query"
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Zoho-oauthtoken {token}",
            "CATALYST-ORG": org,
            "Content-Type": "application/json",
            "Accept": "application/vnd.catalyst.v2+zcql",
        },
        json={"query": query},
        timeout=30,
    )
    log.info(f"ZCQL status: {resp.status_code}")
    if resp.status_code != 200:
        log.warning(f"ZCQL body: {resp.text[:300]}")
        return []
    data = resp.json()
    return data.get("data", data.get("output", []))


_schema_cache = {"crime_types": set(), "locations": set(), "statuses": set(), "expires_at": 0}


def get_known_values():
    """Return the distinct crime_type/location/status values actually in the fir table (cached 5 min)."""
    now = time.time()
    if _schema_cache["expires_at"] > now:
        return _schema_cache

    table = os.getenv("QUICKML_DATASTORE_TABLE", "fir")
    try:
        rows = _zcql(f"SELECT crime_type, location, status FROM {table} LIMIT 300")
        crime_types, locations, statuses = set(), set(), set()
        for row in rows:
            r = row.get(table, row) if isinstance(row, dict) else row
            if r.get("crime_type"):
                crime_types.add(r["crime_type"])
            if r.get("location"):
                locations.add(r["location"])
            if r.get("status"):
                statuses.add(r["status"])
        _schema_cache.update({
            "crime_types": crime_types,
            "locations": locations,
            "statuses": statuses,
            "expires_at": now + 300,
        })
    except Exception as e:
        log.warning(f"Could not refresh known values: {e}")
    return _schema_cache


def extract_date_range(query):
    """Pull an explicit or relative date range out of a natural-language question."""
    ql = query.lower()
    today = datetime.now().date()

    m = re.search(r"\d{4}-\d{2}-\d{2}", query)
    if m:
        return m.group(0), m.group(0)
    if "yesterday" in ql:
        d = today - timedelta(days=1)
        return str(d), str(d)
    if "today" in ql:
        return str(today), str(today)
    m = re.search(r"last (\d+) days?", ql)
    if m:
        return str(today - timedelta(days=int(m.group(1)))), str(today)
    if "this week" in ql:
        return str(today - timedelta(days=today.weekday())), str(today)
    if "this month" in ql:
        return str(today.replace(day=1)), str(today)
    return None, None


def build_filters(user_query):
    """Match the question against the fir table's real crime_type/location/status values."""
    known = get_known_values()
    ql = user_query.lower()
    crime_types = [c for c in known["crime_types"] if c.lower() in ql]
    locations = [l for l in known["locations"] if l.lower() in ql]
    statuses = [s for s in known["statuses"] if s.lower() in ql]
    date_from, date_to = extract_date_range(user_query)
    return crime_types, locations, statuses, date_from, date_to


def query_datastore(crime_types=None, locations=None, statuses=None, date_from=None, date_to=None, limit=10):
    """Query Catalyst Data Store via ZCQL REST API with optional filters."""
    table = os.getenv("QUICKML_DATASTORE_TABLE", "fir")

    def esc(v):
        return v.replace("'", "''")

    conditions = []
    if crime_types:
        conditions.append("(" + " OR ".join(f"crime_type = '{esc(c)}'" for c in crime_types) + ")")
    if locations:
        conditions.append("(" + " OR ".join(f"location = '{esc(l)}'" for l in locations) + ")")
    if statuses:
        conditions.append("(" + " OR ".join(f"status = '{esc(s)}'" for s in statuses) + ")")
    if date_from:
        conditions.append(f"datereported >= '{esc(date_from)} 00:00:00'")
    if date_to:
        conditions.append(f"datereported <= '{esc(date_to)} 23:59:59'")

    where_clause = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    query = (
        f"SELECT ROWID, crime_type, location, narrative, latitude, longitude, datereported, status "
        f"FROM {table}{where_clause} ORDER BY datereported DESC LIMIT {limit}"
    )

    try:
        rows = _zcql(query)
        result = []
        for row in rows:
            r = row.get(table, row) if isinstance(row, dict) else row
            result.append({
                "fir_id": r.get("ROWID"),
                "crime_type": r.get("crime_type"),
                "location": r.get("location"),
                "narrative": r.get("narrative"),
                "latitude": r.get("latitude"),
                "longitude": r.get("longitude"),
                "datereported": r.get("datereported"),
                "status": r.get("status"),
            })
        log.info(f"Data Store returned {len(result)} rows")
        return result
    except Exception as e:
        log.warning(f"Data Store failed: {e}")
        return []


def query_rag(user_query):
    url = os.getenv("QUICKML_RAG_ENDPOINT_URL")
    token = get_access_token()
    org = os.getenv("QUICKML_ORG_ID")
    doc_ids = [d.strip() for d in os.getenv("QUICKML_RAG_DOCUMENT_IDS", "").split(",") if d.strip()]

    if not url or not token or not org:
        return ""
    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {token}", "CATALYST-ORG": org, "Content-Type": "application/json"},
            json={"query": user_query, "documents": doc_ids},
            timeout=30,
        )
        log.info(f"RAG status: {resp.status_code}")
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict):
            for k in ("answer", "response", "output"):
                if k in data:
                    return data[k]
            if "data" in data and isinstance(data["data"], dict):
                d = data["data"]
                return d.get("answer") or d.get("response") or str(d)
        return str(data)
    except Exception as e:
        log.warning(f"RAG failed: {e}")
        return ""


def call_llm(prompt):
    url = os.getenv("QUICKML_LLM_ENDPOINT_URL")
    token = get_access_token()
    org = os.getenv("QUICKML_ORG_ID")
    model = os.getenv("QUICKML_LLM_MODEL", "crm-di-glm47b_30b_it")

    if not url or not token or not org:
        return f"[LLM not configured]\n{prompt}"

    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {token}", "CATALYST-ORG": org, "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful police crime analyst. Answer concisely using ONLY the "
                            "provided facts and context. Cite FIR IDs. Output ONLY the final 2-3 sentence "
                            "answer — no reasoning, no drafts, no critique, no headers, no numbered steps."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 500,
                "temperature": 0.3,
                "stream": False,
            },
            timeout=60,
        )
        log.info(f"LLM status: {resp.status_code}")
        resp.raise_for_status()
        data = resp.json()
        if "choices" in data:
            return data["choices"][0]["message"]["content"]
        if "data" in data and isinstance(data["data"], dict) and "choices" in data["data"]:
            return data["data"]["choices"][0]["message"]["content"]
        if "response" in data:
            return data["response"]
        if "data" in data and isinstance(data["data"], dict) and "response" in data["data"]:
            return data["data"]["response"]
        return str(data)
    except Exception as e:
        log.error(f"LLM failed: {e}")
        return f"LLM error: {e}"


@app.route("/", methods=["GET"])
def root():
    return jsonify({"status": "ok", "service": "Hello Crime POC"})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "rag_configured": bool(os.getenv("QUICKML_RAG_ENDPOINT_URL")),
        "llm_configured": bool(os.getenv("QUICKML_LLM_ENDPOINT_URL")),
        "token_configured": bool(os.getenv("QUICKML_ACCESS_TOKEN")),
    })

@app.route("/stats", methods=["GET"])
def stats():
    """Aggregate view of the fir table for a dashboard: counts, breakdowns, trend, recent records."""
    table = os.getenv("QUICKML_DATASTORE_TABLE", "fir")
    rows = _zcql(
        f"SELECT ROWID, crime_type, location, status, latitude, longitude, datereported "
        f"FROM {table} ORDER BY datereported DESC LIMIT 300"
    )

    records = []
    for row in rows:
        r = row.get(table, row) if isinstance(row, dict) else row
        records.append({
            "fir_id": r.get("ROWID"),
            "crime_type": r.get("crime_type"),
            "location": r.get("location"),
            "status": r.get("status"),
            "latitude": r.get("latitude"),
            "longitude": r.get("longitude"),
            "datereported": r.get("datereported"),
        })

    def counts_by(key):
        c = {}
        for r in records:
            v = (r.get(key) or "").strip()
            if v:
                c[v] = c.get(v, 0) + 1
        # Merge case-insensitive duplicates (dirty demo data has e.g. "Closed" / "closed").
        merged = {}
        display = {}
        for label, count in c.items():
            k = label.lower()
            merged[k] = merged.get(k, 0) + count
            if k not in display or count > c.get(display[k], 0):
                display[k] = label
        return sorted(
            ({"label": display[k], "count": v} for k, v in merged.items()),
            key=lambda x: -x["count"],
        )

    daily = {}
    for r in records:
        d = (r.get("datereported") or "")[:10]
        if d:
            daily[d] = daily.get(d, 0) + 1
    trend = [{"date": d, "count": c} for d, c in sorted(daily.items())][-30:]

    today = str(datetime.now().date())
    closed = sum(1 for r in records if (r.get("status") or "").strip().lower() == "closed")

    return jsonify({
        "total": len(records),
        "closed": closed,
        "open": len(records) - closed,
        "today": daily.get(today, 0),
        "by_crime_type": counts_by("crime_type"),
        "by_status": counts_by("status"),
        "by_location": counts_by("location")[:8],
        "trend": trend,
        "recent": records[:20],
    })


@app.route("/debug", methods=["GET"])
def debug():
    return jsonify({
        "llm_url": os.getenv("QUICKML_LLM_ENDPOINT_URL") or "MISSING",
        "rag_url": os.getenv("QUICKML_RAG_ENDPOINT_URL") or "MISSING",
        "org_id": os.getenv("QUICKML_ORG_ID") or "MISSING",
        "llm_model": os.getenv("QUICKML_LLM_MODEL") or "MISSING",
        "rag_docs": os.getenv("QUICKML_RAG_DOCUMENT_IDS") or "MISSING",
        "table": os.getenv("QUICKML_DATASTORE_TABLE") or "MISSING",
        "refresh_token_set": bool(os.getenv("ZOHO_REFRESH_TOKEN")),
        "client_id_set": bool(os.getenv("ZOHO_CLIENT_ID")),
        "client_secret_set": bool(os.getenv("ZOHO_CLIENT_SECRET")),
    })


@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    

    body = request.get_json(silent=True) or {}
    user_query = (body.get("query") or "").strip()
    if not user_query:
        return jsonify({"error": "Empty query"}), 400

    crime_types, locations, statuses, date_from, date_to = build_filters(user_query)
    log.info(f"Filters -> crime_types={crime_types} locations={locations} statuses={statuses} date=({date_from}, {date_to})")

    facts = query_datastore(crime_types, locations, statuses, date_from, date_to, limit=10)
    if not facts and not any([crime_types, locations, statuses, date_from]):
        # Nothing in the question matched a known value - fall back to recent records for general context.
        facts = query_datastore(limit=10)
    context = query_rag(user_query)

    facts_str = "\n".join(
        f"- FIR #{f.get('fir_id')}: {f.get('crime_type')} at {f.get('location')} "
        f"({f.get('status')}, reported {f.get('datereported')}). {f.get('narrative', '')[:200]}"
        for f in facts
    ) or "No structured records found."

    prompt = f"""User question: {user_query}

Structured facts from database:
{facts_str}

Additional context from case narratives:
{context or "(none)"}

Write a concise 2-3 sentence answer for the investigator. Cite FIR IDs where relevant."""

    answer = call_llm(prompt)

    return jsonify({
        "answer": answer,
        "facts": facts,
        "context": context,
        "filters": {
            "crime_types": crime_types,
            "locations": locations,
            "statuses": statuses,
            "date_from": date_from,
            "date_to": date_to,
        },
    })


if __name__ == "__main__":
    port = int(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT", 9000))
    app.run(host="0.0.0.0", port=port, debug=False)