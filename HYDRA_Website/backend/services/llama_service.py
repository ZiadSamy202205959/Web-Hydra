import os
import json
import logging
import requests
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration Constants ---
# --- Configuration Constants ---
DEFAULT_SYSTEM_PROMPT = """You are a cybersecurity analyst assistant.
You provide defensive security analysis only.
You must NOT generate exploit code or attack steps.
Your task is to explain attacks and recommend mitigations and patches.

Return results in STRICT JSON format with the following schema:
{
  "attack_type": "string",
  "root_cause": "string",
  "risk_level": "low|medium|high|critical",
  "mitigations": [
    { "category": "code|config|waf", "description": "string" }
  ],
  "virtual_patches": [
    { "target": "WAF|Nginx|App", "rule": "string" }
  ],
  "references": [
    { "standard": "OWASP|CWE|NIST", "id": "string", "title": "string" }
  ]
}
"""

REQUIRED_JSON_SCHEMA_KEYS = [
    "attack_type", "root_cause", "risk_level", "mitigations", "virtual_patches", "references"
]

# --- Abstract Provider ---

class LlamaProvider(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Generates a completion from the LLM.
        Must return a dictionary containing the parsed JSON response.
        """
        pass

# --- Concrete Providers ---

class RemoteLlamaProvider(LlamaProvider):
    def __init__(self, api_url: str, api_key: str, model: str = "llama3-70b-8192"):
        self.api_url = api_url
        self.api_key = api_key
        self.model = model

    def generate(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Example payload structure for OpenAI-compatible APIs (Groq, OpenRouter, etc.)
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2, # Scaled for stable output
            "response_format": {"type": "json_object"} # Force JSON if supported
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            # Extract content from OpenAI-compatible format
            content = data['choices'][0]['message']['content']
            return self._parse_json(content)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Remote LLM Request Failed: {e}")
            raise Exception(f"Provider Error: {str(e)}")
        except (KeyError, IndexError) as e:
            logger.error(f"Unexpected API Response Format: {data}")
            raise Exception("Invalid API Response Format")

    def _parse_json(self, content: str) -> Dict[str, Any]:
        try:
            # clean potential markdown fences
            if "```json" in content:
                content = content.replace("```json", "").replace("```", "")
            return json.loads(content)
        except json.JSONDecodeError:
            raise Exception("Failed to parse LLM output as JSON")


class LocalLlamaProvider(LlamaProvider):
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3"):
        self.base_url = base_url
        self.model = model

    def generate(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        # Ollama API endpoint
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "system": system_prompt,
            "prompt": user_prompt,
            "stream": False,
            "format": "json" # Enforce JSON mode in Ollama
        }

        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            
            content = data.get('response', '')
            return json.loads(content)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Local LLM Request Failed: {e}")
            raise Exception(f"Local Provider Error: {str(e)}")
        except json.JSONDecodeError:
            raise Exception("Failed to parse Local LLM output as JSON")


class MockProvider(LlamaProvider):
    """
    Mock provider for testing without API usage.
    """
    def generate(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        time.sleep(1) # Simulate latency
        return {
            "attack_type": "SQL Injection (Mock)",
            "root_cause": "Improper sanitization of user input in database queries.",
            "risk_level": "critical",
            "mitigations": [
                {"category": "code", "description": "Use parameterized queries or prepared statements."},
                {"category": "config", "description": "Minimize database user privileges."}
            ],
            "virtual_patches": [
                {"target": "WAF", "rule": "Block requests containing 'UNION SELECT' or 'OR 1=1'"}
            ],
            "references": [
                {"standard": "OWASP", "id": "A03:2021", "title": "Injection"}
            ]
        }

# --- Service Class ---

class LlamaService:
    def __init__(self):
        self.provider = self._init_provider()

    def _init_provider(self) -> LlamaProvider:
        # Default to remote if not specified, unless key missing then mock
        provider_type = os.getenv("LLM_PROVIDER", "remote").lower()
        
        if provider_type == "remote":
            api_url = os.getenv("LLM_REMOTE_URL", "https://api.groq.com/openai/v1/chat/completions")
            api_key = os.getenv("LLM_API_KEY")
            model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
            if not api_key:
                logger.warning("No LLM_API_KEY found. Falling back to Mock provider.")
                return MockProvider()
            return RemoteLlamaProvider(api_url, api_key, model)
            
        elif provider_type == "local":
            base_url = os.getenv("LLM_LOCAL_URL", "http://localhost:11434")
            model = os.getenv("LLM_MODEL", "llama3")
            return LocalLlamaProvider(base_url, model)
            
        else:
            return MockProvider()

    def analyze_attack(self, description: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Main entry point for analyzing an attack.
        """
        # 1. Sanitize Input
        safe_description = self._sanitize(description)
        
        # 2. Build User Prompt
        # Ignore context in the prompt template as the user requested a SPECIFIC template that only uses {attack_description}
        # However, if context is critical, we might want to append it, but strict adherence to request suggests using their template.
        # "Given the following attack description: '{attack_description}' ... Tasks: ..."
        
        user_prompt = f"""Given the following attack description:
"{safe_description}"

Tasks:
1. Classify the attack type
2. Explain the root cause
3. Provide concrete remediation steps
4. Suggest virtual patching actions (WAF or config)
5. Reference relevant standards (OWASP, CWE)

Return STRICT JSON only.
"""

        # 3. Generate and Handle Errors/Fallback
        try:
            result = self.provider.generate(DEFAULT_SYSTEM_PROMPT, user_prompt)
            self._validate_schema(result)
            return result
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            # Identify if it's a schema error to log raw result for admin (could use e.args)
            return self._get_fallback_response(safe_description, str(e))

    def _sanitize(self, text: str) -> str:
        """
        Sanitizes input by removing sensitive patterns and truncating.
        """
        if not text: return ""
        
        # 1. Truncate (Safely)
        text = text[:2000] 
        
        # 2. Redact Common Secrets (Basic RegEx patterns could be added here)
        # For now, simple keyword replacement for demonstration
        sensitive_keywords = ["Cookie:", "Authorization:", "Bearer ", "sk-", "ghp_"]
        for keyword in sensitive_keywords:
            if keyword in text:
                 # Simple redaction logic
                 text = text.replace(keyword, "[REDACTED]")
                 
        return text

    def _get_fallback_response(self, description: str, error_msg: str = "") -> Dict[str, Any]:
        """
        Returns a schema-compliant fallback response.
        """
        return {
            "attack_type": "Security Incident (Analysis Failed)",
            "root_cause": "Could not determine specifics due to analysis service unavailability.",
            "risk_level": "medium",
            "mitigations": [
                 {"category": "config", "description": "Enable WAF blocking mode."},
                 {"category": "code", "description": "Review logs for suspicious activity matching: " + description[:50]}
            ],
            "virtual_patches": [],
            "references": [],
            "error": f"Analysis service processed failed: {error_msg}"
        }

    def _validate_schema(self, data: Dict[str, Any]):
        for key in REQUIRED_JSON_SCHEMA_KEYS:
            if key not in data:
                raise ValueError(f"Missing required key in LLM response: {key}")
