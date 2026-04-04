export interface IndiaLocationSeed {
  name: string;
  lat: number;
  lon: number;
}

export const INDIAN_STATE_LOCATIONS: IndiaLocationSeed[] = [
  { name: "Andhra Pradesh", lat: 15.9129, lon: 79.74 },
  { name: "Arunachal Pradesh", lat: 28.218, lon: 94.7278 },
  { name: "Assam", lat: 26.2006, lon: 92.9376 },
  { name: "Bihar", lat: 25.0961, lon: 85.3131 },
  { name: "Chhattisgarh", lat: 21.2787, lon: 81.8661 },
  { name: "Goa", lat: 15.2993, lon: 74.124 },
  { name: "Gujarat", lat: 22.2587, lon: 71.1924 },
  { name: "Haryana", lat: 29.0588, lon: 76.0856 },
  { name: "Himachal Pradesh", lat: 31.1048, lon: 77.1734 },
  { name: "Jharkhand", lat: 23.6102, lon: 85.2799 },
  { name: "Karnataka", lat: 15.3173, lon: 75.7139 },
  { name: "Kerala", lat: 10.8505, lon: 76.2711 },
  { name: "Madhya Pradesh", lat: 22.9734, lon: 78.6569 },
  { name: "Maharashtra", lat: 19.7515, lon: 75.7139 },
  { name: "Manipur", lat: 24.6637, lon: 93.9063 },
  { name: "Meghalaya", lat: 25.467, lon: 91.3662 },
  { name: "Mizoram", lat: 23.1645, lon: 92.9376 },
  { name: "Nagaland", lat: 26.1584, lon: 94.5624 },
  { name: "Odisha", lat: 20.9517, lon: 85.0985 },
  { name: "Punjab", lat: 31.1471, lon: 75.3412 },
  { name: "Rajasthan", lat: 27.0238, lon: 74.2179 },
  { name: "Sikkim", lat: 27.533, lon: 88.5122 },
  { name: "Tamil Nadu", lat: 11.1271, lon: 78.6569 },
  { name: "Telangana", lat: 18.1124, lon: 79.0193 },
  { name: "Tripura", lat: 23.9408, lon: 91.9882 },
  { name: "Uttar Pradesh", lat: 26.8467, lon: 80.9462 },
  { name: "Uttarakhand", lat: 30.0668, lon: 79.0193 },
  { name: "West Bengal", lat: 22.9868, lon: 87.855 },
  { name: "Andaman and Nicobar Islands", lat: 11.7401, lon: 92.6586 },
  { name: "Chandigarh", lat: 30.7333, lon: 76.7794 },
  { name: "Dadra and Nagar Haveli and Daman and Diu", lat: 20.4283, lon: 72.8397 },
  { name: "Delhi", lat: 28.7041, lon: 77.1025 },
  { name: "Jammu and Kashmir", lat: 33.7782, lon: 76.5762 },
  { name: "Ladakh", lat: 34.2268, lon: 77.5619 },
  { name: "Lakshadweep", lat: 10.5667, lon: 72.6417 },
  { name: "Puducherry", lat: 11.9416, lon: 79.8083 },
];

export const INDIAN_STATE_NAMES = INDIAN_STATE_LOCATIONS.map((row) => row.name);
