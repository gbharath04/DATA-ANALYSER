import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, accuracy_score
import joblib
import json

def load_and_preprocess_data():
    # Load the data
    df = pd.read_csv('building_data_clustered.csv')
    # Remove outliers for regression targets
    df = df[(df['Energy_Consumption_Per_SqM'] < df['Energy_Consumption_Per_SqM'].quantile(0.99)) &
            (df['Occupancy_Rate'] < df['Occupancy_Rate'].quantile(0.99))]
    
    # Define features for different prediction tasks
    energy_features = ['Building_Type', 'Number_of_Floors', 'Smart_Devices_Count', 
                      'Construction_Year', 'Area', 'Occupancy_Rate']
    
    maintenance_features = ['Building_Type', 'Number_of_Floors', 'Smart_Devices_Count',
                          'Construction_Year', 'Area', 'Energy_Consumption_Per_SqM']
    
    occupancy_features = ['Building_Type', 'Number_of_Floors', 'Smart_Devices_Count',
                         'Construction_Year', 'Area', 'Energy_Consumption_Per_SqM']
    
    # Prepare data for each prediction task
    X_energy = df[energy_features]
    y_energy = df['Energy_Consumption_Per_SqM']
    
    X_maintenance = df[maintenance_features]
    y_maintenance = df['Maintenance_Priority']
    
    X_occupancy = df[occupancy_features]
    y_occupancy = df['Occupancy_Rate']
    
    return {
        'energy': (X_energy, y_energy),
        'maintenance': (X_maintenance, y_maintenance),
        'occupancy': (X_occupancy, y_occupancy)
    }

def create_preprocessing_pipeline(categorical_features):
    # Create preprocessing pipeline
    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])
    
    numeric_features = ['Number_of_Floors', 'Smart_Devices_Count', 'Construction_Year']
    numeric_transformer = Pipeline(steps=[
        ('scaler', StandardScaler())
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])
    
    return preprocessor

def train_models():
    # Load and preprocess data
    data = load_and_preprocess_data()
    
    # Define categorical features
    categorical_features = ['Building_Type', 'Area']
    
    # Create preprocessing pipeline
    preprocessor = create_preprocessing_pipeline(categorical_features)
    
    # Train Energy Consumption Model
    X_energy, y_energy = data['energy']
    X_energy_train, X_energy_test, y_energy_train, y_energy_test = train_test_split(X_energy, y_energy, test_size=0.2, random_state=42)
    energy_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', GradientBoostingRegressor(n_estimators=200, random_state=42))
    ])
    energy_pipeline.fit(X_energy_train, y_energy_train)
    y_energy_pred = energy_pipeline.predict(X_energy_test)
    energy_mae = np.mean(np.abs(y_energy_test - y_energy_pred))
    energy_mse = np.mean((y_energy_test - y_energy_pred) ** 2)
    energy_r2 = energy_pipeline.score(X_energy_test, y_energy_test)
    
    # Train Maintenance Priority Model
    X_maintenance, y_maintenance = data['maintenance']
    maintenance_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    maintenance_pipeline.fit(X_maintenance, y_maintenance)
    
    # Train Occupancy Rate Model
    X_occupancy, y_occupancy = data['occupancy']
    X_occupancy_train, X_occupancy_test, y_occupancy_train, y_occupancy_test = train_test_split(X_occupancy, y_occupancy, test_size=0.2, random_state=42)
    occupancy_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', GradientBoostingRegressor(n_estimators=200, random_state=42))
    ])
    occupancy_pipeline.fit(X_occupancy_train, y_occupancy_train)
    y_occupancy_pred = occupancy_pipeline.predict(X_occupancy_test)
    occupancy_mae = np.mean(np.abs(y_occupancy_test - y_occupancy_pred))
    occupancy_mse = np.mean((y_occupancy_test - y_occupancy_pred) ** 2)
    occupancy_r2 = occupancy_pipeline.score(X_occupancy_test, y_occupancy_test)
    
    # Save models
    joblib.dump(energy_pipeline, 'models/energy_model.joblib')
    joblib.dump(maintenance_pipeline, 'models/maintenance_model.joblib')
    joblib.dump(occupancy_pipeline, 'models/occupancy_model.joblib')
    
    # Save feature names for each model
    feature_names = {
        'energy': X_energy.columns.tolist(),
        'maintenance': X_maintenance.columns.tolist(),
        'occupancy': X_occupancy.columns.tolist()
    }
    with open('models/feature_names.json', 'w') as f:
        json.dump(feature_names, f)
    # Save metrics
    metrics = {
        'energy': {'mae': float(energy_mae), 'mse': float(energy_mse), 'r2': float(energy_r2)},
        'occupancy': {'mae': float(occupancy_mae), 'mse': float(occupancy_mse), 'r2': float(occupancy_r2)}
    }
    with open('models/model_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    print('Energy Model - MAE:', energy_mae, 'MSE:', energy_mse, 'R2:', energy_r2)
    print('Occupancy Model - MAE:', occupancy_mae, 'MSE:', occupancy_mse, 'R2:', occupancy_r2)

def make_predictions(building_data):
    # Load models
    energy_model = joblib.load('models/energy_model.joblib')
    maintenance_model = joblib.load('models/maintenance_model.joblib')
    occupancy_model = joblib.load('models/occupancy_model.joblib')
    
    # Load feature names
    with open('models/feature_names.json', 'r') as f:
        feature_names = json.load(f)
    
    # Make predictions
    energy_pred = energy_model.predict(building_data[feature_names['energy']])[0]
    maintenance_pred = maintenance_model.predict(building_data[feature_names['maintenance']])[0]
    occupancy_pred = occupancy_model.predict(building_data[feature_names['occupancy']])[0]
    
    return {
        'energy_consumption': round(energy_pred, 2),
        'maintenance_priority': maintenance_pred,
        'occupancy_rate': round(occupancy_pred, 2)
    }

if __name__ == '__main__':
    # Create models directory if it doesn't exist
    import os
    os.makedirs('models', exist_ok=True)
    
    # Train and save models
    train_models()
    print("Models trained and saved successfully!") 