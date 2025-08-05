from flask import Flask, request, jsonify,abort
import pandas as pd
import numpy as np
from scipy.signal import find_peaks
from flask_cors import CORS
import requests
import traceback
import time
import datetime
import json

app= Flask(__name__)
CORS(app)

def getdata(tableName,tags, start_time, end_time):
    url = 'http://10.79.58.13/kawai/api/v1/readdata'
    try:
        
        # API request
        response = requests.post(url,
            json={
                "tableName": tableName,
                "sensorids": tags,
                "starttime": start_time,
                "endtime"  : end_time
            },
            timeout=10  # Timeout to prevent hanging
        )
        print("response")
        print(response)
        # Check HTTP status
        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code} from the server.")
            return pd.DataFrame()

        # Parse JSON response
        response_data = response.json()
        
        # Check if data exists
        if not response_data or "data" not in response_data or not response_data["data"]:
            print("Warning: No data received for the specified inputs.")
            return pd.DataFrame()

        # Convert to DataFrame
        df = pd.DataFrame(response_data["data"])
        if df.empty:
            print("Warning: Data is empty after conversion to DataFrame.")
            return pd.DataFrame()

        # Ensure 'time' column is datetime and pivot the DataFrame
        df["time"] = pd.to_datetime(df["time"], errors='coerce')
        pivot_df = df.pivot(index='time', columns='sensorid', values='measurement').reset_index()

        # Clean column names
        pivot_df.columns.name = None
        pivot_df = pivot_df.rename_axis(None, axis=1)

        return pivot_df

    except requests.exceptions.RequestException as e:
        print(f"Error: An exception occurred while making the API request - {e}")
        return pd.DataFrame()
    except ValueError as e:
        print(f"Error: Failed to process the JSON response - {e}")
        return pd.DataFrame()
    except Exception as e:
        print(f"Error: An unexpected error occurred - {e}")
        return pd.DataFrame()
        
        
        


def detect_overshoot(df, pid_setpoint, pid_meas, control_valve,cv_high,cv_low):
    peaks, _ = find_peaks(df[pid_meas])
    overshoot_df = df.iloc[peaks].copy()
    overshoot_df["overshoot_amount"] = overshoot_df[pid_meas] - overshoot_df[pid_setpoint]
    overshoot_df = overshoot_df[overshoot_df["overshoot_amount"] > 0]  # True overshoot only
    overshoot_df["control_valve_high"] = overshoot_df[control_valve] > cv_high
    overshoot_df["control_valve_low"] = overshoot_df[control_valve] < cv_low
    return overshoot_df

def detect_undershoot(df, pid_setpoint, pid_meas, control_valve,cv_high,cv_low):
    valleys, _ = find_peaks(-df[pid_meas])  # Find local minima (valleys)
    undershoot_df = df.iloc[valleys].copy()
    undershoot_df["undershoot_amount"] = undershoot_df[pid_setpoint] - undershoot_df[pid_meas]
    undershoot_df = undershoot_df[undershoot_df["undershoot_amount"] > 0]  # True undershoot only
    undershoot_df["control_valve_high"] = undershoot_df[control_valve] > cv_high
    undershoot_df["control_valve_low"] = undershoot_df[control_valve] < cv_low
    return undershoot_df


def detect_sluggish_response(df, pid_setpoint, pid_meas, control_valve,cv_low):
    return df[(df[pid_meas] < df[pid_setpoint]) & (df[control_valve] < cv_low)]

# Function to detect long settling time (Adaptive Threshold)
def detect_settling_time(df, pid_setpoint, pid_meas, tolerance=0.05):  # 5% of setpoint
    error_margin = df[pid_setpoint] * tolerance
    return df[abs(df[pid_meas] - df[pid_setpoint]) > error_margin]

# Function to detect oscillations using Zero-Crossing Rate
def detect_oscillations(df, pid_meas, window=10):
    diff = np.sign(df[pid_meas].diff())
    zero_crossings = (diff != diff.shift(1)).astype(int).rolling(window=window).sum()
    threshold = zero_crossings.quantile(0.90)  # High-frequency changes
    return df[zero_crossings > threshold]

def suggest_pid_tuning(issue,pid):
    """Suggest adjustments to Kp, Ki, and Kd based on detected issues."""
    tuning_recommendations = {}

    kp,kd,ki= [2.5, 3.5, 0.30] if issue == "PID1" else [2.0, 3.0, 0.35]


    if issue == "High Oscillations":
        kp -= 0.2 * kp  # Reduce Kp
        kd += 0.15 * kd  # Increase Kd
    elif issue == "High Settling Time":
        kp += 0.15 * kp  # Increase Kp
        ki += 0.10 * ki  # Increase Ki
    elif issue == "Steady-State Error":
        kp += 0.20 * kp  # Increase Kp
        ki += 0.15 * ki  # Increase Ki
    elif issue == "Valve Fully Open But Outlet Temp Low":
        kp += 0.20 * kp
        ki += 0.10 * ki
    elif issue == "Overshoot and control_valve_high":
        kp -= 0.2 * kp  # Reduce Kp to prevent excessive response
        kd += 0.15 * kd  # Increase Kd to dampen overshoot
    elif issue == "Undershoot and control_valve_high":
        kp += 0.2 * kp  # Increase Kp to improve response
        ki += 0.15 * ki  # Increase Ki for better accuracy
    elif issue == "Overshoot and control_valve_low":
        kp += 0.2 * kp  # Increase Kp to improve response
        ki += 0.15 * ki  # Increase Ki for better accuracy
    elif issue == "Undershoot and control_valve_low":
        kp -= 0.2 * kp  # Reduce Kp to prevent excessive response 

    tuning_recommendations[pid] = [kp, ki, kd]

    return tuning_recommendations

def suggest_tuning(overshoot, undershoot, sluggish, settling, oscillations, df):
    suggestions = []

    if not overshoot.empty:
        avg_overshoot = overshoot["overshoot_amount"].mean()
        if overshoot["control_valve_low"].any():
            issue = "Overshoot and control_valve_low"
            suggestions.append({
                "message": f"Overshoot detected ({avg_overshoot:.2f}°C): Increase Kp of PID2 to improve spray activation.",
                "tuning": suggest_pid_tuning(issue, "PID2")
            })
        elif overshoot["control_valve_high"].any():
            issue = "Overshoot and control_valve_high"
            suggestions.append({
                "message": f"Overshoot detected ({avg_overshoot:.2f}°C): Reduce Kp of PID1 to prevent excessive cooling.",
                "tuning": suggest_pid_tuning(issue, "PID1")
            })

    if not undershoot.empty:
        avg_undershoot = undershoot["undershoot_amount"].mean()
        if undershoot["control_valve_high"].any():
            issue = "Undershoot and control_valve_high"
            suggestions.append({
                "message": f"Undershoot detected ({avg_undershoot:.2f}°C): Increase Kp of PID1 to improve heating response.",
                "tuning": suggest_pid_tuning(issue, "PID1")
            })
        elif undershoot["control_valve_low"].any():
            issue = "Undershoot and control_valve_low"
            suggestions.append({
                "message": f"Undershoot detected ({avg_undershoot:.2f}°C): Reduce Kp of PID2 to avoid delayed correction.",
                "tuning": suggest_pid_tuning(issue, "PID2")
            })

    if not sluggish.empty:
        suggestions.append({
            "message": "Sluggish response detected: Increase Kp or Ki of PID2 to speed up correction.",
            "tuning": suggest_pid_tuning("Sluggish", "PID2")
        })
    
    if not settling.empty:
        suggestions.append({
            "message": "Long settling time detected: Increase Ki of PID1 for better steady-state tracking.",
            "tuning": suggest_pid_tuning("Settling", "PID1")
        })
    
    if not oscillations.empty:
        suggestions.append({
            "message": "Oscillations detected: Reduce Kp of PID1 or increase Kd to dampen oscillations.",
            "tuning": suggest_pid_tuning("Oscillations", "PID1")
        })

    return suggestions
def prepare_issue_plot_data(df, issue_df, pid_meas, pid_setpoint, title, color, label, tolerance=0.05):
    df['time'] = pd.to_datetime(df['time'])
    df.set_index('time', inplace=True)
    x_values = df.index.to_series().dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
    print(df[pid_meas].head())
    print(df[pid_meas].isna().sum())
    print(df.columns)
    response = {
        "title": title,
        "xlabel": "Time",
        "ylabel": "Value",
        "series": []
    }

    # Measured Output
    response["series"].append({
        "name": "Measured Output",
        "x": x_values,
        "y": df[pid_meas].tolist(),
        "type": "line",
        "color": "blue",
        "style": "dashed"
    })

    # Setpoint
    response["series"].append({
        "name": "Setpoint",
        "x":x_values,
        "y": df[pid_setpoint].tolist(),
        "type": "line",
        "color": "green",
        "style": "solid"
    })

    # Acceptable Range (for PID1)
    if "setpointPrimary" in pid_setpoint:
        upper_limit = (df[pid_setpoint] * (1 + tolerance)).tolist()
        lower_limit = (df[pid_setpoint] * (1 - tolerance)).tolist()

        response["series"].append({
            "name": "Upper Acceptable Limit",
            "x": x_values,
            "y": upper_limit,
            "type": "line",
            "color": "gray",
            "style": "dotted"
        })
        response["series"].append({
            "name": "Lower Acceptable Limit",
            "x": x_values,
            "y": lower_limit,
            "type": "line",
            "color": "gray",
            "style": "dotted"
        })

    # Issue Points
    if not issue_df.empty:
        response["series"].append({
            "name": label,
            "x": x_values,
            "y": issue_df[pid_meas].tolist(),
            "type": "scatter",
            "color": color,
            "marker": "x"
        })
    with open("sample.json", "w") as f:
       json.dump(response,f,indent=4)
    return response
@app.route('/pidtest', methods=['POST'])
def get_data():
    conn = None
    cursor = None
    try:
        # Get the JSON data from the request
        data = request.json
        # print(":::::::::::::::::::::::::::::::::::::::::::::::::")
        # print(data)
        # sensor_ids = data['sensorids']
        starttime = data['starttime']
        endtime = data['endtime']
        
        # print(sensor_ids)
        # Validate inputs
        # if not sensor_ids or not starttime or not endtime:
        #     return jsonify({"error": "Missing sensor_ids, starttime, or endtime in request"}), 400

        # if not isinstance(sensor_ids, list):
        #     return jsonify({"error": "sensor_ids must be a list of integers"}), 400

        # Connect to the database
        # conn = connect_db()
        # cursor = conn.cursor(dictionary=True)

        # # Create query with placeholders
        # query = """
        #     SELECT sensorid, time, measurement 
        #     FROM sensordataKawai 
        #     WHERE sensorid IN (%s) AND time BETWEEN %s AND %s
        # """ % (','.join(['%s'] * len(sensor_ids)), '%s', '%s')

        # print(query)
        # # Execute query with sensor_ids, starttime, and endtime
        # cursor.execute(query, sensor_ids + [starttime, endtime])
        
        # # Fetch all the results
        # result = cursor.fetchall()
        
        sensorTags=[v for k,v in data.items()]
        df = getdata("sensordataKawai",sensorTags,starttime,endtime)
        for col in df.columns:
            if col != "time":
                fdf= {v:k for k,v in data.items() if k!= v}
                df= df.rename(columns=fdf)
                # df=pd.DataFrame(result)
        print(df.columns)
        pid1_setpoint = "setpointPrimary"
        pid1_meas = "measureValuePrimary"
        pid2_setpoint = "measureValueSecondary"
        pid2_meas = "measureValueSecondary"
        control_valve = "controlvalveSecondary"
        
        
        cv_low = df[control_valve].mean() - df[control_valve].std()
        cv_high = df[control_valve].mean() + df[control_valve].std()
        overshoot_pid1 = detect_overshoot(df, pid1_setpoint, pid1_meas, control_valve,cv_high,cv_low)
        undershoot_pid1= detect_undershoot(df, pid1_setpoint, pid1_meas,control_valve,cv_high,cv_low) 
        sluggish_pid2 = detect_sluggish_response(df, pid2_setpoint, pid2_meas, control_valve,cv_low)
        settling_time_pid1 = detect_settling_time(df, pid1_setpoint, pid1_meas)
        oscillations_pid1 = detect_oscillations(df, pid1_meas)
        tuning_suggestions = suggest_tuning(overshoot_pid1,undershoot_pid1, sluggish_pid2, settling_time_pid1, oscillations_pid1, df)
        print("len of df")
        print(len(df))
        print(len(oscillations_pid1))
        # print(":::::::::::::::::::::::::################################")
        if not oscillations_pid1.empty:
            oscillationPercentage= (len(oscillations_pid1)/len(df))*100
        if not overshoot_pid1.empty:
            overshootPercentage=(len(overshoot_pid1)/len(df))*100
        if not undershoot_pid1.empty:
            undershootPercentage=(len(undershoot_pid1)/len(df))*100
        if not settling_time_pid1.empty:
            SettlingTimePercentage=(len(settling_time_pid1)/len(df))*100
    
        percentages = {
            "oscillationPercentage": oscillationPercentage,
            "overshootPercentage": overshootPercentage,
            "undershootPercentage": undershootPercentage,
            "SettlingTimePercentage": SettlingTimePercentage
        }

        # Find the variable with the highest percentage that is above 40%
        selected_variable = max(percentages, key=lambda k: percentages[k] if percentages[k] > 40 else -1)
        print("selected_variable")
        print(selected_variable,percentages[selected_variable])

        # If no variable is above 40%, select df
        if percentages[selected_variable] <= 2:
            selected_variable = df
        else :
            if selected_variable == "oscillationPercentage":
                 selected_variable = oscillations_pid1
                 print("oscillations_pid1")
                 print(oscillations_pid1.columns)
                 data=prepare_issue_plot_data(df, selected_variable, pid1_meas, pid1_setpoint, "PID1 Oscillations", "cyan", "Oscillation")
            elif selected_variable == "overshootPercentage":
                 selected_variable = overshoot_pid1
                 data=prepare_issue_plot_data(df, selected_variable, pid1_meas, pid1_setpoint, "PID1 overshoot", "red", "overshoot")
        
            elif selected_variable == "undershootPercentage":
                 selected_variable = undershoot_pid1
                 data=prepare_issue_plot_data(df, selected_variable, pid1_meas, pid1_setpoint, "PID1 undershoot", "orange", "undershoot")
            elif selected_variable == "SettlingTimePercentage":
                 selected_variable = settling_time_pid1
                 data=prepare_issue_plot_data(df, selected_variable, pid1_meas, pid1_setpoint, "PID1 settling time", "purple", "settlingtime")
                 
        return jsonify(data),200
                 
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    finally:
        # Close the cursor and connection if they were created
        if cursor:
            cursor.close()
        if conn:
            conn.close()             
        
if __name__ == '__main__':
    app.run(host="0.0.0.0", threaded=True, debug=True)
            

        
        
        

        
        
        
        
        

      
    