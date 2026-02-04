
import pandas as pd
import numpy as np
import re
from math import log2

def entropy(s):
    """Calculate Shannon entropy of a string."""
    if not s:
        return 0.0
    prob = [float(s.count(c)) / len(s) for c in dict.fromkeys(list(s))]
    return -sum([p * log2(p) for p in prob])

def extract_features(df_input: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw request columns into numerical features.
    Expected input columns (some may be missing/nans):
    ['Method', 'User-Agent', 'Accept', 'host', 'cookie', 'content-type', 'lenght', 'content', 'URL']
    """
    df = df_input.copy()
    
    # Ensure text columns are strings
    text_cols = ['Method', 'User-Agent', 'Accept', 'host', 'cookie', 'content-type', 'content', 'URL']
    for col in text_cols:
        if col not in df.columns:
            df[col] = ""
        df[col] = df[col].astype(str).fillna("")

    # === Feature Extraction Logic ===
    
    # 1. URL Features
    df['url_len'] = df['URL'].apply(len)
    df['url_entropy'] = df['URL'].apply(entropy)
    df['url_dots'] = df['URL'].apply(lambda x: x.count('.'))
    df['url_slashes'] = df['URL'].apply(lambda x: x.count('/'))
    df['url_digits'] = df['URL'].apply(lambda x: sum(c.isdigit() for c in x))
    df['url_special'] = df['URL'].apply(lambda x: sum(1 for c in x if c in "<>'\";()$!"))
    
    # Keywords
    df['url_has_sql'] = df['URL'].apply(lambda x: 1 if re.search(r'(union|select|insert|update|drop|alter)', x.lower()) else 0)
    df['url_has_xss'] = df['URL'].apply(lambda x: 1 if re.search(r'(script|alert|onerror|onload)', x.lower()) else 0)
    df['url_has_trav'] = df['URL'].apply(lambda x: 1 if '..' in x else 0)

    # 2. Body/Content Features
    df['body_len'] = df['content'].apply(len)
    df['body_entropy'] = df['content'].apply(entropy)
    df['body_has_sql'] = df['content'].apply(lambda x: 1 if re.search(r'(union|select|insert|update|drop|alter)', x.lower()) else 0)
    df['body_has_xss'] = df['content'].apply(lambda x: 1 if re.search(r'(script|alert|onerror|onload)', x.lower()) else 0)
    df['body_has_shell'] = df['content'].apply(lambda x: 1 if re.search(r'(cmd|bash|sh|exec|wget|curl)', x.lower()) else 0)

    # 3. User-Agent Features
    df['ua_len'] = df['User-Agent'].apply(len)
    df['ua_entropy'] = df['User-Agent'].apply(entropy)
    df['ua_has_tool'] = df['User-Agent'].apply(lambda x: 1 if re.search(r'(curl|wget|python|nmap|sqlmap|nikto)', x.lower()) else 0)

    # 4. Method (Keep as Categorical or Simple Map)
    known_methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']
    # We can use one-hot or just a simple index map. Let's use index map for simplicity with Trees.
    df['method_id'] = df['Method'].apply(lambda x: known_methods.index(x) if x in known_methods else -1)

    # 5. Cookie
    df['cookie_len'] = df['cookie'].apply(len)
    
    # Select only numeric columns for the model
    # Note: 'lenght' from original dataset is likely content-length, we can keep it or replace with body_len.
    # The original dataset has 'lenght' (typo). We should probably use our computed body_len for consistency,
    # but let's keep 'lenght' if available as 'orig_len' just in case.
    if 'lenght' in df.columns:
        df['orig_len'] = pd.to_numeric(df['lenght'], errors='coerce').fillna(0)
    else:
        df['orig_len'] = 0

    feature_cols = [
        'url_len', 'url_entropy', 'url_dots', 'url_slashes', 'url_digits', 'url_special',
        'url_has_sql', 'url_has_xss', 'url_has_trav',
        'body_len', 'body_entropy', 'body_has_sql', 'body_has_xss', 'body_has_shell',
        'ua_len', 'ua_entropy', 'ua_has_tool',
        'method_id', 'cookie_len'
    ]
    
    return df[feature_cols]
