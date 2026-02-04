import os
import time
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import hashlib
from services.llama_service import LlamaService

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Services
llama_service = LlamaService()

# Configuration
VT_API_KEY = os.getenv('VT_API_KEY')

OTX_API_KEY = os.getenv('OTX_API_KEY')
ABUSEIPDB_API_KEY = os.getenv('ABUSEIPDB_API_KEY')

# Constants
CACHE_TTL = 1800  # 30 minutes in seconds
TIMEOUT = 5  # Request timeout in seconds

# Simple in-memory cache: {(provider, type, value): (timestamp, data)}
CACHE = {}

# Rate Limiter
class RateLimiter:
    def __init__(self, calls, period):
        self.calls = calls
        self.period = period
        self.timestamps = []

    def allow(self):
        now = time.time()
        # Remove timestamps older than period
        self.timestamps = [t for t in self.timestamps if now - t < self.period]
        
        if len(self.timestamps) < self.calls:
            self.timestamps.append(now)
            return True, 0
        else:
            # Return time to wait
            oldest = self.timestamps[0]
            wait_time = self.period - (now - oldest)
            return False, wait_time

# Limits
# VT: 4/min (Standard Free)
vt_limiter = RateLimiter(4, 60)
# AbuseIPDB: 1000/day (Free)
abuse_limiter = RateLimiter(1000, 86400)
# Feed cache TTLs
FEED_CACHE_TTL_ABUSE = 43200 # 12 hours (to respect 5 req/day limit)
FEED_CACHE_TTL_OTX = 3600    # 1 hour

# Patching Module Config
# 10 requests per minute per IP (Defensive)
patch_limiter = RateLimiter(10, 60)
PATCH_CACHE_TTL = 86400 # 24 hours
PATCH_CACHE = {}

def get_cached_data(provider, type_, value):
    """Retrieve data from cache if valid."""
    key = (provider, type_, value)
    if key in CACHE:
        timestamp, data = CACHE[key]
        if time.time() - timestamp < CACHE_TTL:
            return data
        else:
            del CACHE[key]  # Expired
    return None

def set_cached_data(provider, type_, value, data):
    """Store data in cache."""
    key = (provider, type_, value)
    CACHE[key] = (time.time(), data)

def validate_params(req_args, required_params):
    """Validate presence of required parameters."""
    for param in required_params:
        if not req_args.get(param):
            return f"Missing required parameter: {param}"
    return None

@app.route('/api/ti/virustotal', methods=['GET'])
def virustotal():
    error = validate_params(request.args, ['type', 'value'])
    if error:
        return jsonify({'error': error}), 400

    ti_type = request.args.get('type')
    value = request.args.get('value')
    
    if not VT_API_KEY:
        return jsonify({'error': 'Server configuration error: Missing VirusTotal API Key'}), 500

    # Check cache
    cached = get_cached_data('virustotal', ti_type, value)
    if cached:
        return jsonify(cached)

    # Rate Limit Check
    allowed, wait_time = vt_limiter.allow()
    if not allowed:
        return jsonify({
            'error': 'VirusTotal rate limit exceeded (4/min). Please wait.',
            'retry_after': round(wait_time, 1)
        }), 429

    # API Request
    headers = {'x-apikey': VT_API_KEY}
    
    # Map types to VT endpoints
    # ip -> ip_addresses, domain -> domains, hash -> files
    endpoint_map = {
        'ip': 'ip_addresses',
        'domain': 'domains',
        'hash': 'files'
    }
    
    if ti_type not in endpoint_map:
        return jsonify({'error': f"Invalid type: {ti_type}. Must be 'ip', 'domain', or 'hash'"}), 400
        
    url = f"https://www.virustotal.com/api/v3/{endpoint_map[ti_type]}/{value}"

    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        
        if response.status_code == 404:
            result = {
                'provider': 'virustotal',
                'type': ti_type,
                'value': value,
                'risk': 'unknown',
                'summary': 'Not found in VirusTotal',
                'raw': None
            }
            # Cache "not found" as well to save quota
            set_cached_data('virustotal', ti_type, value, result)
            return jsonify(result)
            
        response.raise_for_status()
        data = response.json()
        
        # Normalize Data
        attributes = data.get('data', {}).get('attributes', {})
        stats = attributes.get('last_analysis_stats', {})
        malicious = stats.get('malicious', 0)
        suspicious = stats.get('suspicious', 0)
        
        risk = 'clean'
        if malicious > 0:
            risk = 'high' if malicious > 2 else 'medium'
        elif suspicious > 0:
            risk = 'low'
            
        summary = f"Malicious: {malicious}, Suspicious: {suspicious}, Harmless: {stats.get('harmless', 0)}"
        
        normalized = {
            'provider': 'virustotal',
            'type': ti_type,
            'value': value,
            'risk': risk,
            'summary': summary,
            'raw': data
        }
        
        set_cached_data('virustotal', ti_type, value, normalized)
        return jsonify(normalized)

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f"Upstream error: {str(e)}"}), 502


@app.route('/api/ti/otx', methods=['GET'])
def otx():
    error = validate_params(request.args, ['type', 'value'])
    if error:
        return jsonify({'error': error}), 400

    ti_type = request.args.get('type')
    value = request.args.get('value')

    if not OTX_API_KEY:
        return jsonify({'error': 'Server configuration error: Missing OTX API Key'}), 500

    # Check cache
    cached = get_cached_data('otx', ti_type, value)
    if cached:
        return jsonify(cached)
        
    # Map types to OTX endpoints
    # ip -> IPv4, domain -> domain, hash -> file
    # OTX uses different casing
    endpoint_map = {
        'ip': 'IPv4',
        'domain': 'domain',
        'hash': 'file'
    }
    
    if ti_type not in endpoint_map:
        return jsonify({'error': f"Invalid type: {ti_type}. Must be 'ip', 'domain', or 'hash'"}), 400
        
    url = f"https://otx.alienvault.com/api/v1/indicators/{endpoint_map[ti_type]}/{value}/general"
    headers = {'X-OTX-API-KEY': OTX_API_KEY}

    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        
        if response.status_code == 404:
             result = {
                'provider': 'otx',
                'type': ti_type,
                'value': value,
                'risk': 'unknown',
                'summary': 'Not found in OTX',
                'raw': None
            }
             set_cached_data('otx', ti_type, value, result)
             return jsonify(result)

        response.raise_for_status()
        data = response.json()
        
        # Normalize Data
        pulse_info = data.get('pulse_info', {})
        pulse_count = pulse_info.get('count', 0)
        
        risk = 'clean'
        if pulse_count > 0:
            # Simple heuristic: more pulses = higher risk? or check references?
            # Keeping it simple for now
            risk = 'medium' if pulse_count < 5 else 'high'
            
        summary = f"Found in {pulse_count} OTX pulses"
        
        normalized = {
            'provider': 'otx',
            'type': ti_type,
            'value': value,
            'risk': risk,
            'summary': summary,
            'raw': data
        }
        
        set_cached_data('otx', ti_type, value, normalized)
        return jsonify(normalized)

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f"Upstream error: {str(e)}"}), 502


@app.route('/api/ti/abuseipdb', methods=['GET'])
def abuseipdb():
    error = validate_params(request.args, ['value']) # Type implied as IP
    if error:
        return jsonify({'error': error}), 400
        
    value = request.args.get('value')
    
    if not ABUSEIPDB_API_KEY:
        return jsonify({'error': 'Server configuration error: Missing AbuseIPDB API Key'}), 500

    # Check cache
    cached = get_cached_data('abuseipdb', 'ip', value)
    if cached:
        return jsonify(cached)

    # Rate Limit Check
    allowed, wait_time = abuse_limiter.allow()
    if not allowed:
        return jsonify({
            'error': 'AbuseIPDB daily limit exceeded (1000/day).',
            'retry_after': int(wait_time)
        }), 429

    url = 'https://api.abuseipdb.com/api/v2/check'
    querystring = {
        'ipAddress': value,
        'maxAgeInDays': '90'
    }
    headers = {
        'Key': ABUSEIPDB_API_KEY,
        'Accept': 'application/json'
    }

    try:
        response = requests.get(url, headers=headers, params=querystring, timeout=TIMEOUT)
        
        # AbuseIPDB returns 422 for invalid IP, mapped to 400
        if response.status_code == 422:
             return jsonify({'error': 'Invalid IP address format'}), 400

        response.raise_for_status()
        data = response.json()
        
        # Normalize Data
        item = data.get('data', {})
        score = item.get('abuseConfidenceScore', 0)
        
        risk = 'clean'
        if score > 0:
            if score < 25: risk = 'low'
            elif score < 75: risk = 'medium'
            else: risk = 'high'
            
        summary = f"Abuse Confidence Score: {score}%"
        
        normalized = {
            'provider': 'abuseipdb',
            'type': 'ip',
            'value': value,
            'risk': risk,
            'summary': summary,
            'raw': data
        }
        
        set_cached_data('abuseipdb', 'ip', value, normalized)
        return jsonify(normalized)

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f"Upstream error: {str(e)}"}), 502

# --- FEED ENDPOINTS ---

@app.route('/api/ti/feed/abuseipdb', methods=['GET'])
def feed_abuseipdb():
    if not ABUSEIPDB_API_KEY:
        return jsonify({'error': 'Missing AbuseIPDB API Key'}), 500

    # Strict Cache Check
    cached = get_cached_data('abuseipdb', 'feed', 'blacklist')
    if cached:
        return jsonify(cached)

    url = 'https://api.abuseipdb.com/api/v2/blacklist'
    querystring = {'limit': '10', 'confidenceMinimum': '90'}
    headers = {'Key': ABUSEIPDB_API_KEY, 'Accept': 'application/json'}

    try:
        response = requests.get(url, headers=headers, params=querystring, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Normalize
        normalized = []
        for item in data.get('data', []):
            normalized.append({
                'ip': item.get('ipAddress'),
                'score': item.get('abuseConfidenceScore'),
                'country': item.get('countryCode'),
                'reportDate': item.get('lastReportedAt')
            })
            
        result = {'provider': 'abuseipdb', 'data': normalized}
        
        # Cache for 12 hours!
        # Manually set with custom TTL or use different key logic? 
        # For simplicity, we reuse set_cached_data but hack the TTL logic or just accept 30m?
        # WAIT: The global CACHE_TTL is 30 mins. We need to override or handle this.
        # Let's simple modify set_cached_data to accept ttl or handle it here.
        
        # Override logic for feeds:
        key = ('abuseipdb', 'feed', 'blacklist')
        # Store with special marker or just trust the getter? 
        # The getter checks global TTL. We need to modify getter/setter to support custom TLL.
        # For now, let's just create a separate FEED_CACHE to be safe and simple.
        FEED_CACHE[key] = (time.time(), result, FEED_CACHE_TTL_ABUSE)
        
        return jsonify(result)

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f"Upstream error: {str(e)}"}), 502

@app.route('/api/ti/feed/otx', methods=['GET'])
def feed_otx():
    if not OTX_API_KEY:
        return jsonify({'error': 'Missing OTX API Key'}), 500

    cached = get_feed_cache('otx', 'feed', 'pulses')
    if cached: return jsonify(cached)

    url = 'https://otx.alienvault.com/api/v1/pulses/subscribed'
    headers = {'X-OTX-API-KEY': OTX_API_KEY}
    
    try:
        response = requests.get(url, headers=headers, params={'limit': 10}, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        normalized = []
        for item in data.get('results', []):
            normalized.append({
                'name': item.get('name'),
                'id': item.get('id'),
                'created': item.get('created'),
                'author': item.get('author_name'),
                'tags': item.get('tags', [])[:3]
            })
            
        result = {'provider': 'otx', 'data': normalized}
        set_feed_cache('otx', 'feed', 'pulses', result, FEED_CACHE_TTL_OTX)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 502

# Separate Feed Cache
FEED_CACHE = {}

def get_feed_cache(provider, type_, value):
    key = (provider, type_, value)
    if key in FEED_CACHE:
        timestamp, data, ttl = FEED_CACHE[key]
        if time.time() - timestamp < ttl:
            return data
    return None

def set_feed_cache(provider, type_, value, data, ttl):
    key = (provider, type_, value)
    FEED_CACHE[key] = (time.time(), data, ttl)

def get_patch_cache(key):
    if key in PATCH_CACHE:
        timestamp, data = PATCH_CACHE[key]
        if time.time() - timestamp < PATCH_CACHE_TTL:
            return data
        del PATCH_CACHE[key]
    return None

def set_patch_cache(key, data):
    PATCH_CACHE[key] = (time.time(), data)

@app.route('/api/patch/recommend', methods=['POST'])
def recommend_patch():
    # 1. Rate Limiting
    allowed, wait_time = patch_limiter.allow()
    if not allowed:
        return jsonify({
            'error': 'Rate limit exceeded for analysis generation.',
            'retry_after': int(wait_time)
        }), 429

    # 2. Input Validation
    data = request.get_json()
    if not data or 'attack_description' not in data:
        return jsonify({'error': 'Missing required field: attack_description'}), 400

    description = data['attack_description']
    context = data.get('context', {})

    # 3. Caching (Hash of description)
    # We use a hash of the description to strictly cache identical queries for 24h
    desc_hash = hashlib.sha256(description.encode('utf-8')).hexdigest()
    cached_result = get_patch_cache(desc_hash)
    if cached_result:
        return jsonify({**cached_result, "_cached": True})

    # 4. Generate Analysis
    try:
        result = llama_service.analyze_attack(description, context)
        
        if "error" in result:
             # If service returns an error object (fallback)
             return jsonify(result), 500
             
        # 5. Cache Success Result
        set_patch_cache(desc_hash, result)
        
        return jsonify({**result, "_cached": False})

    except Exception as e:
        return jsonify({'error': f"Internal Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
