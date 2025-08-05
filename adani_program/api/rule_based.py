# rule_based.py
import numpy as np
import pandas as pd
from   scipy.signal import find_peaks
import matplotlib.pyplot as plt


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

    tuning_recommendations[pid] = {"Pband":round(100/kp, 3), "ki":round(ki, 3), "kd":round(kd, 3)}
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
            "message": "Long settling time detected: Increase Kp and Ki of PID1 for better steady-state tracking.",
            "tuning": suggest_pid_tuning("High Settling Time", "PID1", closedloop, openLoop)
        })

    elif issue_type == "oscillations" and not issue_df.empty:
        suggestions.append({
            "message": "Oscillations detected: Reduce Kp of PID1 or increase Kd to dampen oscillations.",
            "tuning": suggest_pid_tuning("Oscillations", "PID1", closedloop, openLoop)
        })

    return suggestions
def prepare_issue_plot_data(df, issue_df, pid_meas, pid_setpoint,closedloop,openLoop,tuning_suggestions, title, color, label, tolerance=0.03):
    

    try:
        conservatives = tuning_suggestions[0]["tuning"].get("PID1") or tuning_suggestions[0]["tuning"].get("PID2") or {}
    except :
        conservatives = {"Pband": 100/1.2, "ki": 2.5, "kd": 0.345}
    if not conservatives:
        conservatives = {"Pband": 100/1.2, "ki": 2.5, "kd": 0.345}
  
    print("conservatives",conservatives)
    # Ensure 'time' is datetime and set as index
    
    df["finetunedValues"] = simulate_pid_response(
    df,
    setpoint_col=pid_setpoint,
    measured_col=pid_meas,
    Kp = conservatives["Pband"],
    Ki = conservatives["ki"],
    Kd = conservatives["kd"]
    )

    # Ensure 'time' is datetime and set as index
    df['time'] = pd.to_datetime(df['time'])
    df.set_index('time', inplace=True)
    

    # Common x-axis timestamps
    timestamps = df.index.to_series().dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
    empty={"Pband":"-", "ki":"-", "kd":"-"}
    status= title if not issue_df.empty else "normal"
    # Initialize response format
    response = {
        "title": title,
        "xlabel": "Time",
        "ylabel": "Value",
        "timestamps": timestamps,
        "parameters":{"closed_loop":closedloop,"open_loop":openLoop},
        "suggestedParameters":{"closed_loop":tuning_suggestions[0]["tuning"].get("PID2",empty),"open_loop":tuning_suggestions[0]["tuning"].get("PID1",empty)},
        "recommendation":tuning_suggestions[0]["message"],
        "setpoint":df[pid_setpoint].tolist()[-1],
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
        #print(":::::ISSUE NOT EMPTY")
        # Create a list aligned with `timestamps`, fill with None
        issue_points = [None] * len(timestamps)

        # Map issue_df times to values
        issue_index_str = issue_df.index.to_series().dt.strftime('%Y-%m-%d %H:%M:%S')
        issue_map = dict(zip(issue_index_str, issue_df[pid_meas]))

        # Fill values only where issue occurred
        for i, ts in enumerate(timestamps):
            if ts in issue_map:
                issue_points[i] = issue_map[ts]
        # print("issuepoints")
        # print(issue_points)
        # Add issue points to series
        response["series"]["Issue Points"] = issue_points
    # print(json.dumps(response,indent=4))
    #print(response)
    return response,conservatives

#END OF THE REQUIRED FUNCTIONS::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

def plot_issues(df, issue_df, pid_meas, pid_setpoint, title, color, label, tolerance=0.05):
    plt.figure(figsize=(12, 5))
    
    # Plot measured output
    plt.plot(df.index, df[pid_meas], label="Measured Output", linestyle="--", color="blue")
    
    # Plot setpoint
    plt.plot(df.index, df[pid_setpoint], label="Setpoint", linestyle="-", color="green", linewidth=2)
    #print(pid_setpoint)
    
    # Plot acceptable range (for PID1 cases)
    if "2ND_STG" in pid_setpoint or "MICR_FLW" in pid_setpoint:#PID_1
        print("::::::")
        upper_limit = df[pid_setpoint] * (1 + tolerance)
        lower_limit = df[pid_setpoint] * (1 - tolerance)
        
        plt.plot(df.index, upper_limit, linestyle="dotted", color="gray", label="Upper Acceptable Limit", zorder=3)
        plt.plot(df.index, lower_limit, linestyle="dotted", color="gray", label="Lower Acceptable Limit", zorder=3)
        #y_min=500, y_max=600
        plt.ylim(500, 600)
        


    if "1ST_STG" in pid_setpoint or "EMER_FLW" in pid_setpoint:#PID_1
        print("::::::")
        upper_limit = df[pid_setpoint] * (1 + tolerance)
        lower_limit = df[pid_setpoint] * (1 - tolerance)
        
        plt.plot(df.index, upper_limit, linestyle="dotted", color="gray", label="Upper Acceptable Limit", zorder=3)
        plt.plot(df.index, lower_limit, linestyle="dotted", color="gray", label="Lower Acceptable Limit", zorder=3)   
        #y_min=450, y_max=520
        plt.ylim(400, 550)

    # Highlight issue points
    if not issue_df.empty:
        plt.scatter(issue_df.index, issue_df[pid_meas], color=color, label=label, marker='x', zorder=4)
    #print('good for now')
    
    # Set y-axis limits
    #if y_min is not None and y_max is not None:
    #plt.ylim(y_min, y_max)
    
    # Labels and legend
    plt.legend()
    plt.title(title)
    plt.xlabel("Time")
    plt.ylabel("Value")
    plt.grid(True)
    return plt

