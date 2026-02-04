import pandas as pd
import numpy as np
import joblib
import pathlib
import sys
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, accuracy_score

# === Config ===
BASE_DIR = pathlib.Path(__file__).parent.parent.absolute()
DATASET_PATH = BASE_DIR / "notebooks/owasp_http_requests_100k.csv"
MODEL_OUT = BASE_DIR / "ml_service/ml_model.joblib"

# Add ml_service to path
sys.path.append(str(BASE_DIR / "ml_service"))
try:
    from feature_extractor import extract_features
except ImportError:
    print("[!] Check if ml_service/feature_extractor.py exists")
    sys.exit(1)

# === Manual Test Set (Safe & Malicious) ===
TEST_URLS = [
    # Safe
    ("/home", 0, "Safe"),
    ("/about-us", 0, "Safe"),
    ("/login", 0, "Safe"),
    ("/products?id=123", 0, "Safe"),
    ("/search?q=shoes", 0, "Safe"),
    ("/contact", 0, "Safe"),
    ("/api/v1/status", 0, "Safe"),
    ("/user/profile", 0, "Safe"),
    ("/images/logo.png", 0, "Safe"),
    ("/css/style.css", 0, "Safe"),
    
    # Malicious (from PayloadsAllTheThings)
    (" AND 5650=CONVERT(INT,(UNION ALL SELECTCHAR(88)+CHAR(88)+CHAR(88)))#", 1, "SQLi"),
    (" AND 5650=CONVERT(INT,(UNION ALL SELECTCHAR(88)+CHAR(88)+CHAR(88)))-- ", 1, "SQLi"),
    (" UNION ALL SELECT @@VERSION,USER(),SLEEP(5),BENCHMARK(1000000,MD5('A')),NULL,NULL-- ", 1, "SQLi"),
    (" UNION ALL SELECT 'INJ'||'ECT'||'XXX',2,3,4,5-- ", 1, "SQLi"),
    ("<</script/script><script>eval('\\u'+'0061'+'lert(1)')//</script>", 1, "XSS"),
    ("<link rel=import href=\"data:text/html&comma;&lt;script&gt;alert(1)&lt;&sol;script&gt;", 1, "XSS"),
    ("<script>alert(1)<!–", 1, "XSS"),
    ("<x contenteditable onblur=alert(1)>lose focus!", 1, "XSS"),
    ("<video onloadstart=alert(1)><source>", 1, "XSS"),
    ("javascript:alert(1)", 1, "XSS")
]

def train():
    print(f"[*] Loading dataset from {DATASET_PATH}...")
    if not DATASET_PATH.exists():
        print(f"[!] Error: Dataset not found at {DATASET_PATH}")
        return

    df = pd.read_csv(DATASET_PATH)
    df.fillna("", inplace=True)

    # 1. Feature Extraction
    print("[*] Extracting features...")
    X = extract_features(df)
    y = df['classification'].apply(lambda x: 1 if str(x).lower() in ['anomalous', '1'] else 0)

    # 2. K-Fold Validation
    print("\n[*] Running Stratified K-Fold Validation (k=5)...")
    model = RandomForestClassifier(n_estimators=100, max_depth=20, random_state=42, class_weight='balanced', n_jobs=-1)
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=skf, scoring='accuracy')
    
    print(f"[*] K-Fold Scores: {cv_scores}")
    print(f"[*] Mean Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")

    # 3. Final Training
    print("\n[*] Retraining on full dataset for production...")
    model.fit(X, y)

    # 4. Save Model
    print(f"[*] Saving model to {MODEL_OUT}...")
    joblib.dump(model, MODEL_OUT)

    # 5. Manual Verification
    print("\n" + "="*50)
    print("[*] RUNNING MANUAL VERIFICATION TEST")
    print("="*50)
    print(f"{'URL/Payload':<60} | {'True':<5} | {'Pred':<5} | {'Prob':<6} | {'Result'}")
    print("-" * 100)
    
    # Prepare test DF
    test_rows = []
    for url, lbl, typ in TEST_URLS:
        test_rows.append({
            'Method': 'GET', 
            'URL': url,
            'content': '',
            'User-Agent': 'Mozilla/5.0'
        })
    
    test_df = pd.DataFrame(test_rows)
    X_test_manual = extract_features(test_df)
    
    probs = model.predict_proba(X_test_manual)[:, 1]
    preds = (probs >= 0.5).astype(int)
    
    correct_count = 0
    for i, (url, true_lbl, typ) in enumerate(TEST_URLS):
        pred_lbl = preds[i]
        prob = probs[i]
        is_correct = (pred_lbl == true_lbl)
        if is_correct: correct_count += 1
        
        res_str = "PASS" if is_correct else "FAIL"
        trunc_url = (url[:57] + '...') if len(url) > 57 else url
        print(f"{trunc_url:<60} | {true_lbl:<5} | {pred_lbl:<5} | {prob:.4f} | {res_str}")

    print("-" * 100)
    print(f"Manual Test Accuracy: {correct_count}/{len(TEST_URLS)} ({correct_count/len(TEST_URLS)*100:.1f}%)")
    print("="*50)

if __name__ == "__main__":
    train()
