import requests
import json

# URL of your API endpoint
url = "http://127.0.0.1:5000/pidtest"

# Data to send in JSON format
payload={"setpointPrimary": "KAWAI_U2_1ST_STG_LHS_MN_P_PID_SP",
"measureValuePrimary": "KAWAI_U2_1ST_STG_LHS_MN_P_PID_MEAS",
"outputPrimary"  : "KAWAI_U2_1ST_STG_LHS_MN_P_PID_OP",
"setpointSecondary": "KAWAI_U2_1ST_STG_LHS_MN_S_PID_SP",
"measureValueSecondary": "KAWAI_U2_1ST_STG_LHS_MN_S_PID_MEAS",
"controlvalveSecondary"  : "KAWAI_U2_1ST_STG_LHS_MN_S_PID_OP",
"starttime":"2025-01-01 00:00:00",
"endtime":'2025-01-01 23:45:00'}
# Optional headers (especially if API expects JSON)
headers = {
    "Content-Type": "application/json"
}

# Make POST request
response = requests.post(url, json=payload, headers=headers)

# Check response
if response.status_code == 200:
   with open("response.json", "w") as f:
        json.dump(response.json(), f, indent=4)
       
else:
    print("Error:", response.status_code, response.text)