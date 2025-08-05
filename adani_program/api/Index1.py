from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import pandas as pd


import numpy as np
from   scipy.signal import find_peaks
import traceback
from   flask_cors import CORS
from   datetime import datetime, timedelta
from   flask import Flask, jsonify, request 
import pandas as pd
import PIconnect as PI
from PIconnect.PIConsts import SummaryType



app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


# ALl THE FUNCTIONS REQUIRED FOR PID TUNING ISSUE DETECTION MENTIONED BELOW

def OPMS_Average(tag_list, start, end, time_int):
    PI.PIConfig.DEFAULT_TIMEZONE = 'Asia/Kolkata'

    with PI.PIServer('10.81.54.194') as server:
        points = server.search(tag_list, source='OPMS_APRL_U2')

        df = pd.concat([tag.summaries(start, end, time_int, SummaryType.AVERAGE) for tag in points], axis=1)
    tag_no = len(points)

    for i in range(tag_no):
        tag_name = points[i].name
        df.columns.values[i] = tag_name

    df = df.applymap(lambda x: -1000 if "No Good" in str(x) else x)
    #df.to_csv('fetched_data.csv', index=False)
    #print("Dataframe has been saved to fetched_data.csv")
    #data_df = pd.read_csv('fetched_data.csv')
    df.reset_index(inplace=True)
    df.rename(columns={'index': 'time'}, inplace=True)
    print(df.head())
    return df


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
def detect_settling_time(df, pid_setpoint, pid_meas, tolerance=0.03):  # 5% of setpoint
    error_margin = df[pid_setpoint] * tolerance
    return df[abs(df[pid_meas] - df[pid_setpoint]) > error_margin]

# Function to detect oscillations using Zero-Crossing Rate
def detect_oscillations(df, pid_meas, window=10):
    diff = np.sign(df[pid_meas].diff())
    zero_crossings = (diff != diff.shift(1)).astype(int).rolling(window=window).sum()
    threshold = zero_crossings.quantile(0.90)  # High-frequency changes
    return df[zero_crossings > threshold]

class PID:
    def __init__(self, Kp, Ki, Kd, integral_limit=5000):
        self.Kp = Kp
        self.Ki = Ki
        self.Kd = Kd
        self.integral = 0
        self.previous_error = 0
        self.integral_limit = integral_limit

    def update(self, setpoint, measured_value, dt):
        error = setpoint - measured_value
        self.integral += error * dt
        self.integral = max(min(self.integral, self.integral_limit), -self.integral_limit)
        derivative = (error - self.previous_error) / dt if dt > 0 else 0
        output = self.Kp * error + self.Ki * self.integral + self.Kd * derivative
        self.previous_error = error
        return output

def simulate_pid_response(
    df,
    setpoint_col,
    measured_col,
    Kp,
    Ki,
    Kd,
    dt=0.1,
    process_gain=0.01,
):
    """
    Simulates PID response using a class-based approach and returns the simulated response.

    Parameters:
        df (DataFrame): DataFrame containing the time series.
        setpoint_col (str): Column name for setpoint values.
        measured_col (str): Column name for measured values.
        Kp, Ki, Kd (float): PID gains.
        dt (float): Time interval between samples.
        process_gain (float): Gain factor simulating process dynamics.
        plot (bool): If True, plot the response.

    Returns:
        np.ndarray: Simulated PID-controlled response values.
    """
    time = np.arange(len(df))
    setpoint = df[setpoint_col]
    measured_value = df[measured_col].iloc[0]

    pid = PID(Kp, Ki, Kd)
    simulated_values = []

    for i in range(len(df)):
        output = pid.update(setpoint.iloc[i], measured_value, dt)
        measured_value += process_gain * output
        simulated_values.append(measured_value)


    return np.array(simulated_values)
def suggest_pid_tuning(issue,pid,closedloop,openLoop,):
    """Suggest adjustments to Kp, Ki, and Kd based on detected issues."""
    tuning_recommendations = {}
    print("openLoop",openLoop)
    print("closedloop",closedloop)
    openLoop=[ float(v) for k,v in openLoop.items()]
    closedloop=[ float(v) for k,v in closedloop.items()]

    kp,ki,kd= openLoop if pid == "PID1" else closedloop

    if issue == "Oscillations":
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

    tuning_recommendations[pid] = {"kp":round(kp, 3), "ki":round(ki, 3), "kd":round(kd, 3)}
    print("tuning_recommendations")
    print(tuning_recommendations)
    return tuning_recommendations

def suggest_tuning(issue_type, issue_df, closedloop, openLoop):
    suggestions = []

    if issue_type == "overshoot" and not issue_df.empty:
        avg_overshoot = issue_df["overshoot_amount"].mean()
        if issue_df["control_valve_low"].any():
            issue = "Overshoot and control_valve_low"
            suggestions.append({
                "message": f"Overshoot detected ({avg_overshoot:.2f}°C): Increase Kp of PID2 to improve spray activation.",
                "tuning": suggest_pid_tuning(issue, "PID2", closedloop, openLoop)
            })
        elif issue_df["control_valve_high"].any():
            issue = "Overshoot and control_valve_high"
            suggestions.append({
                "message": f"Overshoot detected ({avg_overshoot:.2f}°C): Reduce Kp of PID1 to prevent excessive cooling.",
                "tuning": suggest_pid_tuning(issue, "PID1", closedloop, openLoop)
            })

    elif issue_type == "undershoot" and not issue_df.empty:
        avg_undershoot = issue_df["undershoot_amount"].mean()
        if issue_df["control_valve_high"].any():
            issue = "Undershoot and control_valve_high"
            suggestions.append({
                "message": f"Undershoot detected ({avg_undershoot:.2f}°C): Increase Kp of PID1 to improve heating response.",
                "tuning": suggest_pid_tuning(issue, "PID1", closedloop, openLoop)
            })
        elif issue_df["control_valve_low"].any():
            issue = "Undershoot and control_valve_low"
            suggestions.append({
                "message": f"Undershoot detected ({avg_undershoot:.2f}°C): Reduce Kp of PID2 to avoid delayed correction.",
                "tuning": suggest_pid_tuning(issue, "PID2", closedloop, openLoop)
            })

    elif issue_type == "sluggish" and not issue_df.empty:
        suggestions.append({
            "message": "Sluggish response detected: Increase Kp or Ki of PID2 to speed up correction.",
            "tuning": suggest_pid_tuning("Sluggish", "PID2", closedloop, openLoop)
        })

    elif issue_type == "settling" and not issue_df.empty:
        suggestions.append({
            "message": "Long settling time detected: Increase kp and  Ki of PID1 for better steady-state tracking.",
            "tuning": suggest_pid_tuning("High Settling Time", "PID1", closedloop, openLoop)
        })

    elif issue_type == "oscillations" and not issue_df.empty:
        suggestions.append({
            "message": "Oscillations detected: Reduce Kp of PID1 or increase Kd to dampen oscillations.",
            "tuning": suggest_pid_tuning("Oscillations", "PID1", closedloop, openLoop)
        })

    return suggestions

#def prepare_issue_plot_data(df, issue_df, pid_meas, pid_setpoint, closedloop, openLoop, tuning_suggestions, title, color, label, tolerance=0.03):
    try:
        conservatives = tuning_suggestions[0]["tuning"].get("PID1") or tuning_suggestions[0]["tuning"].get("PID2") or {}
    except:
        conservatives = {"kp": 1.2, "ki": 2.5, "kd": 0.345}
    if not conservatives:
        conservatives = {"kp": 1.2, "ki": 2.5, "kd": 0.345}

    print("conservatives", conservatives)

    # Ensure 'time' is datetime and set as index
    df["finetunedValues"] = simulate_pid_response(
        df,
        setpoint_col=pid_setpoint,
        measured_col=pid_meas,
        Kp=conservatives["kp"],
        Ki=conservatives["ki"],
        Kd=conservatives["kd"]
    )

    #df.reset_index(inplace=True)
    #df.rename(columns={'index': 'time'}, inplace=True)
    df['time'] = pd.to_datetime(df['time'])
    df.set_index('time', inplace=True)

    # Common x-axis timestamps
    timestamps = df.index.to_series().dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
    empty = {"kp": "-", "ki": "-", "kd": "-"}
    status = title if not issue_df.empty else "normal"

    # Initialize response format
    response = {
        "title": title,
        "xlabel": "Time",
        "ylabel": "Value",
        "timestamps": timestamps,
        "parameters": {"closed_loop": closedloop, "open_loop": openLoop},
        "suggestedParameters": {"closed_loop": tuning_suggestions[0]["tuning"].get("PID2", empty), "open_loop": tuning_suggestions[0]["tuning"].get("PID1", empty)},
        "recommendation": tuning_suggestions[0]["message"],
        "setpoint": df[pid_setpoint].tolist()[-1],
        "status": status,
        "series": {
            "Setpoint": df[pid_setpoint].tolist(),
            "Upper Acceptable Limit": (df[pid_setpoint] * (1 + tolerance)).tolist(),
            "Lower Acceptable Limit": (df[pid_setpoint] * (1 - tolerance)).tolist(),
            "Measured Output": df[pid_meas].tolist(),
            "finetunedValues": df["finetunedValues"].tolist()
        }
    }

    # Add Issue Points (highlighted markers) - scattered on top
    if not issue_df.empty:
        issue_df['time'] = pd.to_datetime(issue_df['time'])
        issue_df.set_index('time', inplace=True)
        print(":::::ISSUE NOT EMPTY")
        # Create a list aligned with `timestamps`, fill with None
        issue_points = [None] * len(timestamps)

        # Map issue_df times to values
        issue_index_str = issue_df.index.to_series().dt.strftime('%Y-%m-%d %H:%M:%S')
        issue_map = dict(zip(issue_index_str, issue_df[pid_meas]))

        # Fill values only where issue occurred
        for i, ts in enumerate(timestamps):
            if ts in issue_map:
                issue_points[i] = issue_map[ts]

        # Add issue points to series
        response["series"]["Issue Points"] = issue_points

    return response

def prepare_issue_plot_data(df, issue_df, pid_meas, pid_setpoint, closedloop, openLoop, tuning_suggestions, title, color, label, tolerance=0.03):
    try:
        conservatives = tuning_suggestions[0]["tuning"].get("PID1") or tuning_suggestions[0]["tuning"].get("PID2") or {}
    except:
        conservatives = {"kp": 1.2, "ki": 2.5, "kd": 0.345}
    if not conservatives:
        conservatives = {"kp": 1.2, "ki": 2.5, "kd": 0.345}

    print("conservatives", conservatives)
    
    # Ensure 'time' is datetime and set as index
    df['time'] = pd.to_datetime(df['time'])
    df.set_index('time', inplace=True)
    
    df["finetunedValues"] = simulate_pid_response(
        df,
        setpoint_col=pid_setpoint,
        measured_col=pid_meas,
        Kp=conservatives["kp"],
        Ki=conservatives["ki"],
        Kd=conservatives["kd"]
    )

    # Common x-axis timestamps
    timestamps = df.index.to_series().dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
    empty = {"kp": "-", "ki": "-", "kd": "-"}
    status = title if not issue_df.empty else "normal"
    
    # Initialize response format
    response = {
        "title": title,
        "xlabel": "Time",
        "ylabel": "Value",
        "timestamps": timestamps,
        "parameters": {"closed_loop": closedloop, "open_loop": openLoop},
        "suggestedParameters": {"closed_loop": tuning_suggestions[0]["tuning"].get("PID2", empty), "open_loop": tuning_suggestions[0]["tuning"].get("PID1", empty)},
        "recommendation": tuning_suggestions[0]["message"],
        "setpoint": df[pid_setpoint].tolist()[-1],
        "status": status,
        "series": {
            "Setpoint": df[pid_setpoint].tolist(),
            "Upper Acceptable Limit": (df[pid_setpoint] * (1 + tolerance)).tolist(),
            "Lower Acceptable Limit": (df[pid_setpoint] * (1 - tolerance)).tolist(),
            "Measured Output": df[pid_meas].tolist(),
            "finetunedValues": df["finetunedValues"].tolist()
        }
    }

    # Add Issue Points (highlighted markers) - scattered on top
    if not issue_df.empty:
        issue_df['time'] = pd.to_datetime(issue_df['time'])
        issue_df.set_index('time', inplace=True)
        print(":::::ISSUE NOT EMPTY")
        
        # Create a list aligned with `timestamps`, fill with None
        issue_points = [None] * len(timestamps)

        # Map issue_df times to values
        issue_index_str = issue_df.index.to_series().dt.strftime('%Y-%m-%d %H:%M:%S')
        issue_map = dict(zip(issue_index_str, issue_df[pid_meas]))

        # Fill values only where issue occurred
        for i, ts in enumerate(timestamps):
            if ts in issue_map:
                issue_points[i] = issue_map[ts]
        
        # Add issue points to series
        response["series"]["Issue Points"] = issue_points

    return response

#END OF THE REQUIRED FUNCTIONS:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

# API FOR SENDING RESPONSE AS PER THE STRUCTURE TO PLOT IN UI
#@app.route('/'+BRANCH_NAME+'/api/v1/pidinfo', methods=['POST'])
@app.route('/fetchPISummaries', methods=['POST'])
def getpid():
    try:
        # Get the JSON data from the request
        data          = request.json
        endtime       = datetime.now()
        starttime     = endtime - timedelta(hours=8)
        time_interval = '10s'
        #starttime = data['starttime']
        #endtime = data['endtime'] 
        closedloop    = data["closedloop"]
        openLoop      = data["open_loop"] 
        print("***********openloop*************")
        print(openLoop)
        print("***********closedloop*************")
        print(closedloop)
        sensorTags    = [v for k,v in data["tags"].items()]
        print("sensorTags")
        print(sensorTags)
        #df           = getpiddata(sensorTags,starttime,endtime)
        df            = OPMS_Average(sensorTags,starttime,endtime,time_interval)

        for col in df.columns:
            if col != "time":
                fdf= {v:k for k,v in data["tags"].items() if k!= v}
                df= df.rename(columns=fdf)
        
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
        # tuning_suggestions = suggest_tuning(overshoot_pid1,undershoot_pid1, sluggish_pid2, settling_time_pid1, oscillations_pid1, df)
        print("len of df")
        print(len(df))
        print(":::::::::::::::::::::::::################################")
        oscillationPercentage=0
        overshootPercentage=0
        undershootPercentage=0
        SettlingTimePercentage=0
        if not oscillations_pid1.empty:
            print("oscillations present")
            print(len(oscillations_pid1))
            oscillationPercentage= (len(oscillations_pid1)/len(df))*100
        if not overshoot_pid1.empty:
            print("overshoot_pid1 present")
            print(len(overshoot_pid1))
            overshootPercentage=(len(overshoot_pid1)/len(df))*100
        if not undershoot_pid1.empty:
            print("undershoot_pid1 present")
            print(len(undershoot_pid1))
            undershootPercentage=(len(undershoot_pid1)/len(df))*100
        if not settling_time_pid1.empty:
            print("settling_time_pid1 present")
            print(len(settling_time_pid1))
            SettlingTimePercentage=(len(settling_time_pid1)/len(df))*100
    
        percentages = {
            "oscillationPercentage": oscillationPercentage,
            "overshootPercentage": overshootPercentage,
            "undershootPercentage": undershootPercentage,
            "SettlingTimePercentage": SettlingTimePercentage
        }

        # Find the variable with the highest percentage that is above 40%
        selected_variable = max(percentages, key=percentages.get)
        max_value = percentages[selected_variable]
        print("selectedvariable",selected_variable)
        print("max_value",max_value)
        # If no variable is above 40%, select df
        if max_value <= 3:
            selected_variable = None
            #data=prepare_issue_plot_data(df,issue_df, pid_meas, pid_setpoint,closedloop,openLoop,tuning_suggestions, title, color, label, tolerance=0.03)
            print("No issue detected, in last 8 hours")
            
        else :
            if selected_variable == "oscillationPercentage":
                 selected_variable = oscillations_pid1
                 print("oscillations_pid1")
                 print(oscillations_pid1.columns)
                 tuning_suggestions=suggest_tuning("oscillations", oscillations_pid1, closedloop, openLoop)
                 data=prepare_issue_plot_data(df, selected_variable, pid1_meas, pid1_setpoint,closedloop,openLoop,tuning_suggestions, "PID1 Oscillations", "cyan", "Oscillation")
            elif selected_variable == "overshootPercentage":
                 print("overshootPercentage")
                 selected_variable = overshoot_pid1
                 tuning_suggestions=suggest_tuning("overshoot", overshoot_pid1, closedloop, openLoop)
                 data=prepare_issue_plot_data(df, selected_variable, pid1_meas, pid1_setpoint,closedloop,openLoop,tuning_suggestions,"PID1 overshoot", "red", "overshoot")
        
            elif selected_variable == "undershootPercentage":
                 print("undershootPercentage")
                 selected_variable = undershoot_pid1
                 tuning_suggestions=suggest_tuning("undershoot", undershoot_pid1, closedloop, openLoop)
                 data=prepare_issue_plot_data(df, selected_variable, pid1_meas, pid1_setpoint,closedloop,openLoop,tuning_suggestions, "PID1 undershoot", "orange", "undershoot")
            elif selected_variable == "SettlingTimePercentage":
                 print("SettlingTimePercentage")
                 selected_variable = settling_time_pid1
                 tuning_suggestions=suggest_tuning("settling", settling_time_pid1, closedloop, openLoop)
                 data=prepare_issue_plot_data(df, selected_variable, pid1_meas, pid1_setpoint,closedloop,openLoop,tuning_suggestions, "PID1 settling time", "purple", "settlingtime")

            


        return jsonify(data),200
                 
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



#@app.route('/fetchPISummaries', methods=['POST'])
def fetch_pi_summaries():
    data = request.json
    tag_list = data.get('tag_list')
    start = data.get('start')
    end = data.get('end')
    time_int = data.get('time_int')

    if not tag_list or not start or not end or not time_int:
        return jsonify({'error': 'Missing parameters'}), 400

    try:
        result = OPMS_Average(tag_list, start, end, time_int)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)  # Run the Flask app on all interfaces

