import os
import re
import math
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Try to load spaCy model
nlp = None
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    print("✅ spaCy model loaded successfully")
except Exception as e:
    print(f"⚠️ spaCy not available, using regex fallback: {e}")

# Try to load sklearn for DBSCAN
dbscan_available = False
try:
    from sklearn.cluster import DBSCAN
    import numpy as np
    dbscan_available = True
    print("✅ scikit-learn loaded for clustering")
except ImportError:
    print("⚠️ scikit-learn not available, clustering will use simple distance grouping")

# ==========================================
# CATEGORY KEYWORDS
# ==========================================

CATEGORY_KEYWORDS = {
    'education': ['school', 'education', 'teacher', 'student', 'classroom', 'books', 'literacy', 'tutoring', 'learning', 'scholarship'],
    'medical': ['medical', 'health', 'doctor', 'hospital', 'medicine', 'clinic', 'disease', 'sick', 'injured', 'treatment', 'vaccine', 'ambulance'],
    'water': ['water', 'drinking', 'well', 'borewell', 'pipeline', 'contaminated', 'drought', 'purification', 'sanitation'],
    'food': ['food', 'hunger', 'meal', 'nutrition', 'ration', 'starving', 'malnourished', 'grain', 'supply'],
    'shelter': ['shelter', 'housing', 'homeless', 'roof', 'building', 'tent', 'camp', 'displaced', 'evacuation'],
    'plumbing': ['plumbing', 'pipe', 'drain', 'sewage', 'toilet', 'bathroom', 'leaking', 'blocked', 'repair'],
}

URGENCY_KEYWORDS = [
    'urgent', 'emergency', 'critical', 'immediate', 'asap', 'dire',
    'no water', 'no food', 'no shelter', 'dying', 'collapsing',
    'flood', 'fire', 'earthquake', 'disaster',
    'days without', 'hours left', 'running out',
]

# ==========================================
# EXTRACT ENDPOINT
# ==========================================

@app.route('/extract', methods=['POST'])
def extract():
    """
    Extract structured fields from raw text (OCR/field report).
    Returns: location, category, urgency_keywords, severity, num_people, time_sensitive
    """
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'text field is required'}), 400

    text = data['text']
    results = []

    # Split by double newlines or numbered items for multiple entries
    sections = re.split(r'\n\s*\n|\d+\.\s+', text)
    sections = [s.strip() for s in sections if s.strip()]

    if not sections:
        sections = [text]

    for section in sections:
        result = extract_from_section(section)
        if result.get('category') or result.get('location'):
            results.append(result)

    # If no sections produced results, treat entire text as one
    if not results:
        results = [extract_from_section(text)]

    return jsonify(results if len(results) > 1 else results[0])


def extract_from_section(text):
    """Extract structured data from a single text section."""
    lower_text = text.lower()

    # --- Category classification ---
    category = 'other'
    max_score = 0
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower_text)
        if score > max_score:
            max_score = score
            category = cat

    # --- Location extraction ---
    location = None
    if nlp:
        doc = nlp(text)
        locations = [ent.text for ent in doc.ents if ent.label_ in ('GPE', 'LOC', 'FAC')]
        if locations:
            location = locations[0]

    # Regex fallback for location
    if not location:
        loc_match = re.search(
            r'(?:location|area|village|town|district|city|region|place)[\s:]+([A-Za-z\s,]+)',
            text, re.IGNORECASE
        )
        if loc_match:
            location = loc_match.group(1).strip().rstrip(',.')

    # --- Urgency keywords ---
    found_urgency = [kw for kw in URGENCY_KEYWORDS if kw in lower_text]

    # --- Time references ---
    time_refs = re.findall(r'(\d+)\s*(days?|hours?|weeks?)\s*(without|left|ago|remaining)', lower_text)
    if time_refs:
        for val, unit, _ in time_refs:
            found_urgency.append(f"{val} {unit}")

    # --- Severity inference ---
    severity = 3  # default medium
    if any(kw in lower_text for kw in ['critical', 'dying', 'emergency', 'disaster', 'collapsing']):
        severity = 5
    elif any(kw in lower_text for kw in ['urgent', 'severe', 'dire', 'immediate']):
        severity = 4
    elif any(kw in lower_text for kw in ['moderate', 'concerning']):
        severity = 3
    elif any(kw in lower_text for kw in ['minor', 'low', 'routine']):
        severity = 2

    # Boost severity based on number of urgency keywords
    if len(found_urgency) >= 3 and severity < 5:
        severity = min(5, severity + 1)

    # --- Number of people ---
    num_people = None
    people_match = re.search(
        r'(\d+)\s*(?:people|persons|individuals|families|villagers|residents|children|affected|victims)',
        lower_text
    )
    if people_match:
        num_people = int(people_match.group(1))
        if 'families' in people_match.group(0):
            num_people *= 4  # Approximate family size

    # --- Time sensitive ---
    time_sensitive = bool(found_urgency) or severity >= 4

    return {
        'location': location,
        'category': category,
        'urgency_keywords': found_urgency,
        'severity': severity,
        'num_people': num_people,
        'time_sensitive': time_sensitive,
        'title': f"{category.capitalize()} need" + (f" in {location}" if location else ""),
        'description': text[:500],
    }


# ==========================================
# MATCH SCORE ENDPOINT
# ==========================================

@app.route('/match-score', methods=['POST'])
def match_score():
    """
    Compute match score between a need and volunteer.
    Input: need JSON + volunteer JSON
    Output: match_score (0-1)
    """
    data = request.get_json()
    if not data or 'need' not in data or 'volunteer' not in data:
        return jsonify({'error': 'need and volunteer objects are required'}), 400

    need = data['need']
    volunteer = data['volunteer']

    # Skill match
    vol_skills = [s.lower() for s in (volunteer.get('skills') or [])]
    need_category = (need.get('category') or '').lower()
    skill_match = 1.0 if need_category in vol_skills else 0.0

    # Distance
    need_lat = need.get('location_lat')
    need_lng = need.get('location_lng')
    vol_lat = volunteer.get('home_lat')
    vol_lng = volunteer.get('home_lng')
    max_radius = volunteer.get('max_radius_km', 25)

    if all(v is not None for v in [need_lat, need_lng, vol_lat, vol_lng]):
        distance = haversine(need_lat, need_lng, vol_lat, vol_lng)
    else:
        distance = max_radius  # Assume max distance if coords missing

    distance_score = max(0, 1 - distance / max_radius) if max_radius > 0 else 0

    # Hard filters
    if skill_match == 0 or distance > max_radius:
        return jsonify({
            'match_score': 0,
            'distance_km': round(distance, 2),
            'breakdown': {'skill': 0, 'distance': 0, 'availability': 0, 'trust': 0}
        })

    # Availability overlap
    availability = volunteer.get('availability', {})
    availability_score = check_availability_overlap(need, availability)

    # Trust score
    trust = (volunteer.get('trust_score', 50)) / 100

    # Weighted score
    score = skill_match * 0.4 + distance_score * 0.3 + availability_score * 0.2 + trust * 0.1

    return jsonify({
        'match_score': round(score, 3),
        'distance_km': round(distance, 2),
        'breakdown': {
            'skill': round(skill_match, 2),
            'distance': round(distance_score, 2),
            'availability': round(availability_score, 2),
            'trust': round(trust, 2),
        }
    })


# ==========================================
# CLUSTER NEEDS ENDPOINT
# ==========================================

@app.route('/cluster-needs', methods=['POST'])
def cluster_needs():
    """
    Cluster needs by proximity using DBSCAN.
    Input: list of needs with lat/lng
    Output: clustered groups (within 200m radius)
    """
    data = request.get_json()
    if not data or 'needs' not in data:
        return jsonify({'error': 'needs array is required'}), 400

    needs = data['needs']
    if len(needs) < 2:
        return jsonify({'clusters': [{'cluster_id': 0, 'needs': needs}]})

    # Filter needs with valid coordinates
    valid_needs = [n for n in needs if n.get('location_lat') and n.get('location_lng')]
    if len(valid_needs) < 2:
        return jsonify({'clusters': [{'cluster_id': 0, 'needs': valid_needs}]})

    if dbscan_available:
        coords = np.array([[n['location_lat'], n['location_lng']] for n in valid_needs])

        # Convert 200m to approximate degrees (very rough: 1 degree ≈ 111km)
        eps_degrees = 0.2 / 111.0  # 200 meters

        # DBSCAN clustering
        clustering = DBSCAN(eps=eps_degrees, min_samples=2, metric='haversine').fit(
            np.radians(coords)
        )
        labels = clustering.labels_

        clusters = {}
        for i, label in enumerate(labels):
            label_key = int(label)
            if label_key not in clusters:
                clusters[label_key] = []
            clusters[label_key].append(valid_needs[i])

        result = [
            {
                'cluster_id': k,
                'needs': v,
                'count': len(v),
                'is_noise': k == -1,
                'center_lat': sum(n['location_lat'] for n in v) / len(v),
                'center_lng': sum(n['location_lng'] for n in v) / len(v),
            }
            for k, v in clusters.items()
        ]
    else:
        # Simple distance-based grouping fallback
        result = simple_cluster(valid_needs, radius_km=0.2)

    return jsonify({'clusters': result})


def simple_cluster(needs, radius_km=0.2):
    """Simple clustering fallback without sklearn."""
    used = set()
    clusters = []
    cluster_id = 0

    for i, n1 in enumerate(needs):
        if i in used:
            continue
        group = [n1]
        used.add(i)

        for j, n2 in enumerate(needs):
            if j in used:
                continue
            dist = haversine(
                n1['location_lat'], n1['location_lng'],
                n2['location_lat'], n2['location_lng']
            )
            if dist <= radius_km:
                group.append(n2)
                used.add(j)

        clusters.append({
            'cluster_id': cluster_id,
            'needs': group,
            'count': len(group),
            'is_noise': len(group) == 1,
            'center_lat': sum(n['location_lat'] for n in group) / len(group),
            'center_lng': sum(n['location_lng'] for n in group) / len(group),
        })
        cluster_id += 1

    return clusters


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def haversine(lat1, lng1, lat2, lng2):
    """Calculate distance between two points in km."""
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def check_availability_overlap(need, availability):
    """Check if volunteer is available at the time of need."""
    if not availability:
        return 0.5

    from datetime import datetime
    days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    
    created = need.get('created_at')
    if created:
        try:
            if isinstance(created, str):
                dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
            else:
                dt = datetime.now()
        except:
            dt = datetime.now()
    else:
        dt = datetime.now()

    day_name = days[dt.weekday()]
    current_hour = dt.hour

    day_slots = availability.get(day_name, [])
    if not day_slots or len(day_slots) < 2:
        return 0

    if current_hour >= day_slots[0] and current_hour <= day_slots[1]:
        return 1.0
    return 0.0


# ==========================================
# HEALTH CHECK
# ==========================================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'spacy_loaded': nlp is not None,
        'sklearn_available': dbscan_available,
    })


# ==========================================
# RUN
# ==========================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
