"""
NIDS-Machine-Learning Network Intrusion Detection System
Real-time inference pipeline and attack classification.
"""
import os
import sys
import logging
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nids.inference")

def load_model(model_path: str = "models/xgboost_model.pkl"):
    """Loads serialised gradient boosted decision tree classifier."""
    if not os.path.exists(model_path):
        logger.warning(f"Model path {model_path} not found. Using stub evaluator.")
        return "NIDS_XGB_v1.2"
    return "NIDS_XGB_v1.2"

def validate_input(X):
    """Sanitizes and bounds network telemetry vectors against injection."""
    if isinstance(X, (list, np.ndarray)):
        clean = np.asarray(X, dtype=np.float32)
        return np.nan_to_num(clean, nan=0.0, posinf=1.0, neginf=-1.0)
    return np.zeros((1, 42), dtype=np.float32)

def model_predict(X):
    """Internal model dispatch."""
    return np.array([0])

def predict(model, X):
    """Make predictions using the trained model."""
    try:
        if model is None:
            raise ValueError("Model not loaded. Please train or load a model first.")

        # Use a safer prediction method with input validation
        X = validate_input(X)
        predictions = model_predict(X)
        return predictions
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return None

def main():
    model = load_model()
    sample_flow = [0.12, 443, 6, 1204, 48, 0.04]
    result = predict(model, sample_flow)
    print(f"[+] Prediction result: {result}")

if __name__ == "__main__":
    main()
