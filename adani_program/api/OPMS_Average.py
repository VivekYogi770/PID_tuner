from datetime import datetime
from datetime import timedelta
import pandas as pd
import PIconnect as PI
from PIconnect.PIConsts import RetrievalMode
from PIconnect.PIConsts import SummaryType
import numpy as np
import pickle

def OPMS_Average(tag_list, start, end,time_int):
    PI.PIConfig.DEFAULT_TIMEZONE = 'Asia/Kolkata'

    with PI.PIServer('10.81.54.194') as server:
        points = server.search(tag_list, source= 'OPMS_APRL_U2')

        df=pd.concat([tag.summaries(start, end,time_int,SummaryType.AVERAGE) for tag in points], axis = 1)    
    tag_no=len(points)

    for i in range(tag_no):
        tag_name = points[i].name    
        df.columns.values[i] = tag_name
    list_output=[]
    j=0
    for i in range(0,len(tag_list)):
        if str(df.columns[j]) == str(tag_list[i]):

            try:
                list_output.append(df.iloc[0,j:j+1][0])

            except:
                print("Cannot convert PIException('[-11059] No Good Data For Calculation') for:  ",tag_list[i])
                list_output.append(-1000.0)
            j+=1
        else:
            print("data unavailable for: ",tag_list[i])
            list_output.append(-1000.0)
    df = df.applymap(lambda x: -1000 if "No Good" in str(x) else x)
    return df


