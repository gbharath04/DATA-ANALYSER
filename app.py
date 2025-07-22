from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from ml_predictions import make_predictions
import json

app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get building data from request
        building_data = request.json
        print("Received data:", building_data)  # Log the incoming data
        
        # Convert to DataFrame
        df = pd.DataFrame([building_data])
        print("DataFrame for prediction:", df)  # Log the DataFrame
        
        # Make predictions
        predictions = make_predictions(df)
        print("Predictions:", predictions)  # Log the predictions
        
        return jsonify(predictions)
    except Exception as e:
        import traceback
        print("Prediction error:", e)
        traceback.print_exc()  # Print full stack trace
        return jsonify({'error': str(e)}), 400

@app.route('/recommend_area', methods=['POST'])
def recommend_area():
    try:
        data = request.json
        building_type = data['building_type']
        outcome = data['outcome']
        # Load data
        df = pd.read_csv('building_data_clustered.csv')
        # Filter by building type
        df_type = df[df['Building_Type'] == building_type]
        if df_type.empty:
            return jsonify({'areas': []})
        # Recommendation logic
        if outcome == 'Occupancy_Rate':
            # Recommend areas with highest average occupancy
            area_scores = df_type.groupby('Area')['Occupancy_Rate'].mean().sort_values(ascending=False)
        elif outcome == 'Energy_Consumption_Per_SqM':
            # Recommend areas with lowest average energy consumption
            area_scores = df_type.groupby('Area')['Energy_Consumption_Per_SqM'].mean().sort_values(ascending=True)
        elif outcome == 'Maintenance_Priority':
            # Recommend areas with lowest proportion of High maintenance
            def priority_score(subdf):
                return (subdf['Maintenance_Priority'] == 'High').mean()
            area_scores = df_type.groupby('Area').apply(priority_score).sort_values(ascending=True)
        else:
            return jsonify({'areas': []})
        # Get top 3 areas
        best_areas = area_scores.head(3).index.tolist()
        return jsonify({'areas': best_areas})
    except Exception as e:
        print('Recommendation error:', e)
        return jsonify({'areas': [], 'error': str(e)}), 400

@app.route('/check_suitability', methods=['POST'])
def check_suitability():
    try:
        data = request.json
        building_type = data['Building_Type']
        area = data['Area']
        num_floors = data['Number_of_Floors']
        df = pd.read_csv('building_data_clustered.csv')
        # Find similar buildings
        similar = df[(df['Building_Type'] == building_type) & (df['Area'] == area) & (df['Number_of_Floors'].astype(int) == int(num_floors))]
        count = len(similar)
        if count == 0:
            message = f"Yes, {area} is available for a {building_type} building with {num_floors} floors."
        else:
            message = f"{area} already has {count} {building_type} building(s) with {num_floors} floors. Consider another area or size."
        return jsonify({'message': message, 'existing_count': count})
    except Exception as e:
        print('Suitability check error:', e)
        return jsonify({'message': 'Error checking suitability.', 'error': str(e)}), 400

@app.route('/model_metrics', methods=['GET'])
def model_metrics():
    try:
        with open('models/model_metrics.json', 'r') as f:
            metrics = json.load(f)
        return jsonify(metrics)
    except Exception as e:
        print('Model metrics error:', e)
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(port=5000) 