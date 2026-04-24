import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import LabelEncoder
import numpy as np
import os

VALID_CATEGORIES = [
    "Food", "Transport", "Education", "Health",
    "Entertainment", "Shopping", "Bills", "Travel", "Others"
]

# Confidence threshold: below this → "Others"
CONFIDENCE_THRESHOLD = 0.20

class ExpenseCategorizer:
    def __init__(self, data_path='dataset.csv'):
        self.data_path = data_path
        self.model = None
        self.categories = []

    def train(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Dataset not found at {self.data_path}")

        df = pd.read_csv(self.data_path)

        if 'Description' not in df.columns or 'Category' not in df.columns:
            raise ValueError("CSV must contain 'Description' and 'Category' columns")

        # Normalize category names to match VALID_CATEGORIES
        mapping = {
            'others': 'Others',
            'food': 'Food',
            'transport': 'Transport',
            'education': 'Education',
            'health': 'Health',
            'entertainment': 'Entertainment',
            'shopping': 'Shopping',
            'bills': 'Bills',
            'travel': 'Travel',
        }
        df['Category'] = df['Category'].str.strip().str.lower().map(mapping).fillna('Others')

        X = df['Description'].str.lower()
        y = df['Category']

        self.categories = list(y.unique())

        # Logistic Regression gives probability scores → better for confidence thresholding
        self.model = make_pipeline(
            TfidfVectorizer(
                stop_words='english',
                max_features=3000,
                ngram_range=(1, 2),
                sublinear_tf=True,
            ),
            LogisticRegression(
                max_iter=1000,
                C=1.5,
                class_weight='balanced',
                solver='lbfgs',
                multi_class='multinomial',
            )
        )

        self.model.fit(X, y)
        print("Model trained successfully with categories:", self.categories)

    def predict(self, description: str) -> str:
        if self.model is None:
            self.train()

        desc_lower = description.lower().strip()
        if not desc_lower:
            return "Others"

        # Get probability for each class
        proba = self.model.predict_proba([desc_lower])[0]
        max_confidence = float(np.max(proba))
        predicted_class = self.model.classes_[int(np.argmax(proba))]

        # Low confidence → Others
        if max_confidence < CONFIDENCE_THRESHOLD:
            return "Others"

        return predicted_class
