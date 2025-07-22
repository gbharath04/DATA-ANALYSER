import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

# Load your dataset
df = pd.read_csv("building_data (2).csv")

# Select features for clustering
features = [
    "Energy_Consumption_Per_SqM",
    "Water_Usage_Per_Building",
    "Waste_Recycled_Percentage",
    "Occupancy_Rate",
    "Number_of_Floors",
    "Smart_Devices_Count",
    "Number_of_Residents",
    "Electricity_Bill"
]

# Handle missing values (if any)
df_cluster = df[features].fillna(df[features].mean())

# Normalize features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(df_cluster)

# Choose number of clusters (e.g., 4)
kmeans = KMeans(n_clusters=4, random_state=42)
df['Cluster'] = kmeans.fit_predict(X_scaled)

# Save the clustered data
df.to_csv("building_data_clustered.csv", index=False)
print("Clustering complete! Output saved as building_data_clustered.csv")
