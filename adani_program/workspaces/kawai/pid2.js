document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  if (window.weatherAPI) {
    window.weatherAPI.init();
  }
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar       = document.getElementById('sidebar');
  const mainContent   = document.getElementById('main-content');
  
  if (sidebarToggle && sidebar && mainContent) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
    });
  }  


  // Load PID hierarchy data
  loadPIDHierarchy();  
  // Set up event listeners for buttons
  setupActionButtons();
  
  // Set up summary reports view toggle
  const summaryReportsLink = document.getElementById('summary-reports-link');
  if (summaryReportsLink) {
    summaryReportsLink.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSummaryReportsView();
    });
  }

  const viewFeedbackButton = document.getElementById('viewFeedback');
  if (viewFeedbackButton) {
    viewFeedbackButton.addEventListener('click', function() {
      toggleFeedbackView();
    });
  }
  
  // Event listener for feedback link in sidebar
  const feedbackLink = document.getElementById('feedback-link');
  if (feedbackLink) {
    feedbackLink.addEventListener('click', function(e) {
      e.preventDefault();
      toggleFeedbackView();
    });
  }
  
  // Setup submit another button functionality
  const submitAnotherButton = document.getElementById('submit-another');
  if (submitAnotherButton) {
    submitAnotherButton.addEventListener('click', function() {
      document.getElementById('form-container').style.display = 'block';
      document.getElementById('thank-you-message').style.display = 'none';
      document.getElementById('feedback-form').reset();
    });
  }
  
  
  
  // Update date and time
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Update date and time
function updateDateTime() {
  const now = new Date();
  
  // Update date
  const dateElem = document.getElementById('current-date');
  if (dateElem) {
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    dateElem.textContent = now.toLocaleDateString('en-US', options);
  }
  
  // Update time
  const timeElem = document.getElementById('current-time');
  if (timeElem) {
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    timeElem.textContent = now.toLocaleTimeString('en-US', options);
  }
}

// // Toggle between PID view and summary reports view
// function toggleSummaryReportsView() {
//   const pidDetailView = document.getElementById('pid-detail-view');
//   const initialMessage = document.getElementById('initial-selection-message');
//   const summaryReportsView = document.getElementById('summary-reports-view');
  
//   if (summaryReportsView && summaryReportsView.style.display === 'none') {
//     // Show summary reports view
//     if (pidDetailView) pidDetailView.style.display = 'none';
//     if (initialMessage) initialMessage.style.display = 'none';
//     summaryReportsView.style.display = 'block';
    
//     // Deselect any active PID in sidebar
//     document.querySelectorAll('.nav-item-link').forEach(link => {
//       link.classList.remove('active');
//     });
    
//     // Highlight the summary reports link
//     const reportsLink = document.getElementById('summary-reports-link');
//     if (reportsLink) reportsLink.classList.add('active');
    
//     showToast('info', 'Viewing summary reports');
//   } else if (summaryReportsView) {
//     // Hide summary reports view
//     summaryReportsView.style.display = 'none';
//     if (initialMessage) initialMessage.style.display = 'block';
    
//     const reportsLink = document.getElementById('summary-reports-link');
//     if (reportsLink) reportsLink.classList.remove('active');
//   }
// }
const API_BASE_URL = "http://127.0.0.1:5000/fetchPISummaries";
// Load PID hierarchy tree data from JSON file
async function loadPIDHierarchy() {
  const container = document.getElementById('pid-hierarchy-tree');
  if (!container) return;
  
  try {
    // Fetch architecture data
    const response = await fetch('pid-architecture.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const architectureData = await response.json();
    window.fullArchitectureData = architectureData;
    
    // Generate HTML for the hierarchy tree
    const html = buildArchitectureTree(architectureData.System);
    container.innerHTML = html;
    
    // Set up tree interactions
    setupTreeInteractions();
    
    // Initialize Lucide icons for newly added elements
    lucide.createIcons();
    
    console.log('PID hierarchy loaded successfully');
  } catch (error) {
    console.error('Failed to load PID hierarchy:', error);
    container.innerHTML = '<div class="error-message">Failed to load PID controllers hierarchy.</div>';
    showToast('error', 'Failed to load PID controllers');
  }
}

// Icons for different node types
const nodeIconMap = {
  "BOILER SYSTEM" : "flame",
  "TURBINE SYSTEM": "wind", 
  "super_heater"  : "thermometer",
  "reheater"      : "thermometer",
  "LHS"           : "panel-left",
  "RHS"           : "panel-right",
  "First_stage"   : "layers",
  "Second_stage"  : "layers",
  "primary_pid"   : "activity",
  "secondary_pid" : "activity",
};

// Build HTML for architecture tree
function buildArchitectureTree(data, path = '') {
  if (!data || typeof data !== 'object') return '';
  
  let html = '<ul class="nav-tree-list">';
  
  // Process each key in the data object
  Object.keys(data).forEach(key => {
    const value = data[key];
    const currentPath = path ? `${path}-${key}` : key;
    
    // Format display name (replace underscores with spaces)
    const displayName = key.replace(/_/g, ' ');
    
    // Determine icon
    const icon = nodeIconMap[key] || 'folder';
    
    // Check node type and build appropriate HTML
    if (key === 'primary_pid') {
      // PID controller node (leaf)
      const iconClass = 'primary-pid';
      
      // Determine status indicator (would be based on real data in production)
      const statusClass = 'normal';
      
      html += `
        <li class="nav-item">
          <a href="#" class="nav-item-link" data-pid-path="${currentPath}">
            <i data-lucide="${icon}" class="${iconClass}"></i>
            <span>${displayName}</span>
            <div class="status-indicator-small ${statusClass}"></div>
          </a>
        </li>
      `;
    } else if (Array.isArray(value)) {
      // Array of objects (like First_stage array)
      let arrayHtml = '';
      
      value.forEach((item, index) => {
        const itemKey = Object.keys(item)[0];
        const itemPath = `${currentPath}-${index}-${itemKey}`;
        const itemDisplayName = itemKey.replace(/_/g, ' ');
        const itemIcon = nodeIconMap[itemKey] || 'folder';
        const itemIconClass = itemKey === 'primary_pid' ? 'primary-pid' : 'secondary-pid';
        
        // Only add primary_pid items to the navigation
        if (itemKey === 'primary_pid') {
          const statusClass = 'normal';
          
          arrayHtml += `
            <li class="nav-item">
              <a href="#" class="nav-item-link" data-pid-path="${itemPath}">
                <i data-lucide="${itemIcon}" class="${itemIconClass}"></i>
                <span>${itemDisplayName}</span>
                <div class="status-indicator-small ${statusClass}"></div>
              </a>
            </li>
          `;
        }
      });
      
      if (arrayHtml) {
        html += `
          <li class="nav-item">
            <a href="#" class="nav-item-link" data-tree-id="${currentPath}">
              <i data-lucide="${icon}"></i>
              <span>${displayName}</span>
              <i data-lucide="chevron-right" class="expand-icon"></i>
            </a>
            <div class="nav-sub-container">
              <ul class="nav-tree-list">
                ${arrayHtml}
              </ul>
            </div>
          </li>
        `;
      }
    } else if (value && typeof value === 'object') {
      if (value.primary_pid) {
        const statusClass = 'normal';
        
        html += `
          <li class="nav-item">
            <a href="#" class="nav-item-link" data-pid-path="${currentPath}-primary_pid">
              <i data-lucide="activity" class="primary-pid"></i>
              <span>${displayName} PID</span>
              <div class="status-indicator-small ${statusClass}"></div>
            </a>
          </li>
        `;
      } else {
        
        const childHTML = buildArchitectureTree(value, currentPath);
        
        if (childHTML !== '<ul class="nav-tree-list"></ul>') {
          html += `
            <li class="nav-item">
              <a href="#" class="nav-item-link" data-tree-id="${currentPath}">
                <i data-lucide="${icon}"></i>
                <span>${displayName}</span>
                <i data-lucide="chevron-right" class="expand-icon"></i>
              </a>
              <div class="nav-sub-container">
                ${childHTML}
              </div>
            </li>
          `;
        }
      }
    }
  });
  
  html += '</ul>';
  return html;
}
function setupTreeInteractions() {
  const treeItems = document.querySelectorAll('.nav-item-link[data-tree-id]');
  treeItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const navItem = this.parentElement;
      navItem.classList.toggle('expanded');
    });
  });

  const pidItems = document.querySelectorAll('.nav-item-link[data-pid-path]');
  pidItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const pidPath = this.getAttribute('data-pid-path');
      document.querySelectorAll('.nav-item-link').forEach(link => {
        link.classList.remove('active');
      });
      this.classList.add('active');

      const summaryView = document.getElementById('summary-reports-view');
      if (summaryView) summaryView.style.display = 'none';

      if (pidPath) {
        loadPIDData(pidPath);
      }
    });
  });
}


//   function setupTreeInteractions() {
//     const treeItems = document.querySelectorAll('.nav-item-link[data-tree-id]');
//     treeItems.forEach(item => {
//       item.addEventListener('click', function(e) {
//         e.preventDefault();
//         const navItem = this.parentElement;
//         navItem.classList.toggle('expanded');
//       });
//     });
  
//     document.querySelectorAll('.nav-tree-list > .nav-item').forEach(item => {
//       item.classList.add('expanded');
//     });

//     const pidItems = document.querySelectorAll('.nav-item-link[data-pid-path]');
//     pidItems.forEach(item => {
//       item.addEventListener('click', function(e) {
//         e.preventDefault();
//         const pidPath = this.getAttribute('data-pid-path');
//         document.querySelectorAll('.nav-item-link').forEach(link => {
//           link.classList.remove('active');
//         });
//         this.classList.add('active');
//         const summaryView = document.getElementById('summary-reports-view');
//         if (summaryView) summaryView.style.display = 'none';
      
//         // Load PID data
//         if (pidPath) {
//           loadPIDData(pidPath);
//         }
//       });
//     });
//   }
 
// async function loadPIDData(pidPath) {
//   if (!pidPath) {
//     console.error('No PID path provided');
//     return;
//   }

//   // Hide initial message and show detail view
//   const initialMessage = document.getElementById('initial-selection-message');
//   const pidDetailView = document.getElementById('pid-detail-view');
  
//   if (initialMessage) initialMessage.style.display = 'none';
//   if (pidDetailView) pidDetailView.style.display = 'block';
  
//   console.log(`Loading PID data for: ${pidPath}`);
  
//   try {
//     // Fetch data from API
//     const pidData = await fetchPIDDataFromAPI(pidPath);
//     console.log("checking whats inside")
//     console.log(pidData)
//     console.log("pid path info")
//     console.log(pidPath)
//     if (pidData) {
//       updatePIDView(pidData, pidPath);
//       return;
//     }
//   } catch (error) {
//     console.error('Error loading PID data:', error);
//     showToast('error', 'Error loading PID data');
//   }
// }

async function loadPIDData(pidPath) {
  if (!pidPath) {
    console.error('No PID path provided');
    return;
  }

  // Hide initial message and show detail view
  const initialMessage = document.getElementById('initial-selection-message');
  const pidDetailView = document.getElementById('pid-detail-view');
  
  if (initialMessage) initialMessage.style.display = 'none';
  if (pidDetailView) pidDetailView.style.display = 'block';
  
  console.log(`Loading PID data for: ${pidPath}`);
  
  try {
    // Fetch data from API
    const pidData = await fetchPIDDataFromAPI(pidPath);
    if (pidData) {
      // Store the PID data globally for simulator access
      window.currentPIDData = pidData;
      updatePIDView(pidData, pidPath);
      return;
    }
  } catch (error) {
    console.error('Error loading PID data:', error);
    showToast('error', 'Error loading PID data');
  }
}

/*async function loadPIDData(pidPath) {
  if (!pidPath) {
    console.error('No PID path provided');
    return;
  }

  const initialMessage = document.getElementById('initial-selection-message');
  const pidDetailView  = document.getElementById('pid-detail-view');

  if (initialMessage) initialMessage.style.display = 'none';
  if (pidDetailView) pidDetailView.style.display   = 'block';

  console.log(`Loading PID data for: ${pidPath}`);

  try {
    const params = createPIDApiPayload(pidPath);
    const pidData = await fetchRealPIDData(API_BASE_URL, params);
    if (pidData) {
      window.currentPIDData = pidData;
      updatePIDView(pidData, pidPath);
      return;
    }
  } catch (error) {
    console.error('Error loading PID data:', error);
    showToast('error', 'Error loading PID data');
  }
}*/

function getCurrentAndPastTime() {
  const currentTime = new Date();
  const pastTime = new Date(currentTime.getTime() - 8 * 60 * 60 * 1000); // Subtract 8 hours

  return {
    currentTime: currentTime.toISOString(),
    pastTime: pastTime.toISOString()
  };
}


const currentTime = new Date();
const eightHoursAgo = new Date(currentTime.getTime() - 8 * 60 * 60 * 1000);




//starttime, endtime = getCurrentAndPastTime();

const starttime = formatDate(currentTime);
const endtime = formatDate(eightHoursAgo);

// API base URL for real data
// YOU SHOULD REPLACE THIS URL WITH YOUR ACTUAL BACKEND API URL
// const API_BASE_URL = "http://127.0.0.1:5000/pidtest";
//const API_BASE_URL = "http://10.79.58.13/pidtuner/api/v1/pidinfo";
//const API_BASE_URL = "http://127.0.0.1:5000/fetchPISummaries"; // Update with your Flask backend URL


// Make real API call to the backend
/*async function fetchRealPIDData(apiUrl, params) {
  try {
    console.log('Sending API request to:', apiUrl);
    console.log('With payload:');
    console.log(params)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    // Get the API response
    const apiResponse = await response.json();
    console.log('Raw API Response:', apiResponse);
    
    return apiResponse;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}*/


async function fetchRealPIDData(apiUrl, params) {
  try {
    console.log('Sending API request to:', apiUrl);
    console.log('With payload:', params);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const apiResponse = await response.json();
    console.log('Raw API Response:', apiResponse);

    return apiResponse;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

function createPIDApiPayload(pidPath) {
  // Parse PID path to get relevant information
  const pathParts = pidPath.split('-');
  const isPrimary = pathParts[pathParts.length - 1] === 'primary_pid';
  
  // Get PID configuration from architecture data
  let pidConfig = null;
  if (window.fullArchitectureData) {
    pidConfig = getPIDConfigFromPath(pidPath, window.fullArchitectureData);
  }
  
  const payload = {
    pidPath: pidPath,
    isPrimary: isPrimary,
    starttime: starttime, //"2025-01-01 00:00:00",
    endtime  : endtime, //"2025-01-01 23:45:00",
    sampleInterval: 10,   // Sample interval in minutes
    includeIssuePoints: true,
    tags: pidConfig ? pidConfig.tags : null,
    closedloop: pidConfig ? pidConfig.parameters.closed_loop : null,
    open_loop:  pidConfig ? pidConfig.parameters.open_loop : null
  };
  
  console.log('Created API payload:', payload);
  return payload;
}
function getPIDConfigFromPath(pidPath, architectureData) {
  if (!pidPath || !architectureData) {
    console.error('Missing path or architecture data');
    return null;
  }
  
  const pathParts = pidPath.split('-');
  let current = architectureData.System;
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    
    if (!current) return null;
    
    if (!isNaN(parseInt(part))) {
      const index = parseInt(part);
      if (Array.isArray(current) && index < current.length) {
        current = current[index];
      } else {
        return null;
      }
    } else {
      // Handle object property
      if (current[part] !== undefined) {
        current = current[part];
      } else {
        return null;
      }
    }
  }
  
  return current;
}

// Fetch PID data from API
async function fetchPIDDataFromAPI(pidPath) {
  console.log('Fetching PID data from API for path:', pidPath);
  
  try {
    // Create payload for API request
    const payload = createPIDApiPayload(pidPath);
    
    // Log the payload for debugging
    console.log('API Request Payload:', payload);
    
    // Make the API call
    const apiData = await fetchRealPIDData(API_BASE_URL, payload);
    
    // Transform API response to the expected format
    return transformApiResponse(apiData, pidPath);
  } catch (error) {
    console.error('Error fetching PID data:', error);
    throw error;
  }
}

// Transform API response to the format expected by updatePIDView
function transformApiResponse(apiData, pidPath) {
  try {
    // Parse the path to create a readable name
    const displayPath = pidPath.split('-')
      .map(part => {
        // Skip array indices
        if (!isNaN(parseInt(part))) return null;
        // Format the part
        return part.replace(/_/g, ' ');
      })
      .filter(Boolean) // Remove null values
      .join(' › ');
    
    console.log('Transforming API response:', apiData);
    
    // Extract values from API response
    const {
      series = {},
      timestamps = [],
      title = 'PID Controller',
      xlabel = 'Time',
      ylabel = 'Value',
      setpoint = {},
      errorMargin = 3,
      status = {},
      parameters = {},
      suggestedParameters = {},
      tags = {},
      recommendation={}
    } = apiData;

    
    
    // Determine status class
    let statusClass     = 'normal';
    let statusCondition = 'Normal';

    if (apiData.status && apiData.status !== 'normal') {
    statusClass = apiData.status;
    statusCondition = apiData.status.charAt(0).toUpperCase() + apiData.status.slice(1);
      }
    
    // Extract series data - handle both formats the API might return
    let setpointValues   = [];
    let actualValues     = [];
    let upperBoundValues = [];
    let lowerBoundValues = [];
    let issuePointValues = [];
    
    // Check if we have a 'series' object with named arrays
    if (series) {
      setpointValues   = series.Setpoint || series.setpoint || [];
      actualValues     = series['Measured Output'] || series.measured || series.actual || [];
      upperBoundValues = series['Upper Acceptable Limit'] || series.upperBound || [];
      lowerBoundValues = series['Lower Acceptable Limit'] || series.lowerBound || [];
      issuePointValues = series['Issue Points'] || series.issuePoints || [];
      finetunedValues  = series['finetunedValues'] || series.finetunedValues || [];
    }
    
    // If we don't have proper upper/lower bounds, calculate them based on setpoint
    if (!upperBoundValues.length && setpointValues.length) {
      upperBoundValues = setpointValues.map(sp => sp * (1 + errorMargin/100));
    }
    
    if (!lowerBoundValues.length && setpointValues.length) {
      lowerBoundValues = setpointValues.map(sp => sp * (1 - errorMargin/100));
    }
    
    console.log('Transformed chart data:', {
      timeLabels     : timestamps,
      setpoint       : setpointValues, 
      actual         : actualValues,
      upperBound     : upperBoundValues,
      lowerBound     : lowerBoundValues,
      issuePoints    : issuePointValues,
      finetunedValues: finetunedValues
    });
    
    // Return transformed data
    return {
      name: displayPath,
      config: {
        tags: tags,
        parameters: apiData.parameters
      },
      status: {
        condition: statusCondition,
        class: statusClass
      },
      setpoint: `${setpoint}°C`,
      errorMargin: `±${errorMargin}%`,
      tags: tags,
      parameters: apiData.parameters,
      suggestedParameters: apiData.suggestedParameters,
      recommendation:apiData.recommendation,
      chartData: {
        timeLabels: timestamps,
        setpoint: setpointValues,
        actual: actualValues,
        upperBound: upperBoundValues,
        lowerBound: lowerBoundValues,
        issuePoints: issuePointValues,
        finetunedValues:finetunedValues
      }
    };
  } catch (error) {
    console.error('Error transforming API response:', error);
    throw error;
  }
}

// Extract PID data from architecture data using path
function getPIDDataFromPath(data, path) {
  if (!data || !path) return null;
  
  const pathParts = path.split('-');
  let current = data;
  
  // Start with the "System" object
  if (pathParts[0] !== 'System' && current.System) {
    current = current.System;
  }
  
  // Navigate through the path
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    
    if (!current) return null;
    
    if (!isNaN(parseInt(part))) {
      // Handle array index
      const index = parseInt(part);
      if (Array.isArray(current) && index < current.length) {
        current = current[index];
      } else {
        return null;
      }
    } else {
      // Handle object property
      if (current[part] !== undefined) {
        current = current[part];
      } else {
        return null;
      }
    }
  }
  
  return current;
}

// Update the PID detail view with loaded data
function updatePIDView(pidData, pidPath) {
  if (!pidData || !pidPath) {
    console.error('Missing data for PID view update');
    return;
  }

  console.log('Updating PID view with data:', pidData);
  
  try {
    // Update title and type
    const pathParts = pidPath.split('-');
    const pidType = pathParts[pathParts.length - 1];
    
    const titleElement = document.getElementById('pid-title');
    if (titleElement) titleElement.textContent = pidData.name;
    
    const typeElement = document.getElementById('pid-type');
    if (typeElement) {
      typeElement.textContent = pidType === 'primary_pid' ? 'Primary' : 'Secondary';
      typeElement.className = `pid-type ${pidType === 'primary_pid' ? 'primary' : 'secondary'}`;
    }
    
    // Update tags display
    if (pidData.tags) {
      const tagsContainer = document.getElementById('pid-tags-container');
      if (tagsContainer) {
        tagsContainer.innerHTML = '';
        
        Object.entries(pidData.tags).forEach(([key, value]) => {
          const tagElement = document.createElement('div');
          tagElement.className = 'pid-tag';
          tagElement.textContent = `${key}: ${value}`;
          //tagsContainer.appendChild(tagElement);
        });
      }
    }
    
    // Update status panels
    const statusElement = document.getElementById('pid-status');
    if (statusElement && pidData.status && pidData.status.condition) {
      console.log(":::::::$$$$$$pidstatus")
      console.log(pidData.status)
      // Check if the status condition is "Normal"
      if (pidData.status.condition.toLowerCase() === 'normal') {
          statusElement.textContent = 'Normal'; // Set text to "Normal"
          statusElement.className = 'status-value normal'; // Apply green class
      } else {
          console.log("::::#######IN ELSE##########")
          statusElement.textContent = pidData.status.condition; // Set text to the actual status
          statusElement.className = 'status-value issue'; // Apply red class for any other status
      }
  }
    
    const errorMarginElement = document.getElementById('pid-error-margin');
    if (errorMarginElement) errorMarginElement.textContent = pidData.errorMargin;
    
    const setpointElement = document.getElementById('pid-setpoint');
    if (setpointElement) setpointElement.textContent = pidData.setpoint;
     
    console.log("::::::::::628:::::::")
    console.log(pidData.parameters)
    // Update parameters display
    if (pidData.parameters) {
      // Update open loop parameters
      const openLoop = pidData.parameters.open_loop;
      if (openLoop) {
        const kpOpenElement = document.getElementById('current-kp-open');
        const kiOpenElement = document.getElementById('current-ki-open');
        const kdOpenElement = document.getElementById('current-kd-open');
         console.log("checking pid loopsdata")
      //    console.log(pidConfig.parameters.closed_loop.kp)
        if (kpOpenElement) kpOpenElement.textContent = openLoop.kp;
        if (kiOpenElement) kiOpenElement.textContent = openLoop.ki;
        if (kdOpenElement) kdOpenElement.textContent = openLoop.kd;
      }
      // pidConfig ? pidConfig.parameters.closed_loop : null,
      
      // Update closed loop parameters
      const closedLoop = pidData.parameters.closed_loop;
      if (closedLoop) {
        const kpClosedElement = document.getElementById('current-kp-closed');
        const kiClosedElement = document.getElementById('current-ki-closed');
        const kdClosedElement = document.getElementById('current-kd-closed');
        
        if (kpClosedElement) kpClosedElement.textContent = closedLoop.kp;
        if (kiClosedElement) kiClosedElement.textContent = closedLoop.ki;
        if (kdClosedElement) kdClosedElement.textContent = closedLoop.kd;
      }
    }
    
    // Update suggested parameters if available
    const suggestedParams = pidData.suggestedParameters;
    const applyButton = document.getElementById('apply-tuning');
    const resetButton = document.getElementById('reset-tuning');
     console.log("suggestedParams")
     console.log(suggestedParams)
    if (suggestedParams) {
      // Open loop suggested parameters
      const suggestedOpenLoop = suggestedParams.open_loop;
      if (suggestedOpenLoop) {
        const suggestedKpOpenElement = document.getElementById('suggested-kp-open');
        const suggestedKiOpenElement = document.getElementById('suggested-ki-open');
        const suggestedKdOpenElement = document.getElementById('suggested-kd-open');
        
        if (suggestedKpOpenElement) suggestedKpOpenElement.textContent = suggestedOpenLoop.kp;
        if (suggestedKiOpenElement) suggestedKiOpenElement.textContent = suggestedOpenLoop.ki;
        if (suggestedKdOpenElement) suggestedKdOpenElement.textContent = suggestedOpenLoop.kd;
      }
      
      // Closed loop suggested parameters
      const suggestedClosedLoop = suggestedParams.closed_loop;
      if (suggestedClosedLoop) {
        const suggestedKpClosedElement = document.getElementById('suggested-kp-closed');
        const suggestedKiClosedElement = document.getElementById('suggested-ki-closed');
        const suggestedKdClosedElement = document.getElementById('suggested-kd-closed');
        
        if (suggestedKpClosedElement) suggestedKpClosedElement.textContent = suggestedClosedLoop.kp;
        if (suggestedKiClosedElement) suggestedKiClosedElement.textContent = suggestedClosedLoop.ki;
        if (suggestedKdClosedElement) suggestedKdClosedElement.textContent = suggestedClosedLoop.kd;
      }
      
      // Enable apply and reset buttons
      if (applyButton) applyButton.disabled = false;
      if (resetButton) resetButton.disabled = false;
    } else {
      // Clear suggested parameters
      const elements = [
        'suggested-kp-open', 'suggested-ki-open', 'suggested-kd-open',
        'suggested-kp-closed', 'suggested-ki-closed', 'suggested-kd-closed'
      ];
      
      elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '-';
      });
      
      // Disable apply and reset buttons
      if (applyButton) applyButton.disabled = true;
      if (resetButton) resetButton.disabled = true;
    }
    
    // Update recommendation based on status
    updateRecommendation(pidData);
    
    // Update chart with the data
    if (pidData.chartData) {
      updatePIDChart(pidData.chartData);
    }
    
    showToast('success', 'PID controller data loaded');
  } catch (error) {
    console.error('Error updating PID view:', error);
    showToast('error', 'Error updating PID view');
  }
}

// Update recommendation based on PID status
function updateRecommendation(pidData) {
  try {
    const recommendationElement = document.getElementById('pid-recommendation');
    if (!recommendationElement) return;
    
    const iconElement = recommendationElement.querySelector('i');
    const contentDiv = recommendationElement.querySelector('div');
    
    if (!contentDiv) return;
    
    // Clear existing content
    contentDiv.innerHTML = '';
    
    // Add new content based on status
    let title, message, icon;
    console.log(":::::status condition data::::::")
    console.log(pidData)
    if (pidData.status.class !== 'normal') {
       // fetch object from DB
      title = pidData.status.class;
      message = pidData.recommendation;
      icon = "alert-triangle";
    } else {
      title = 'Controller is operating within normal parameters';
      message = 'No tuning adjustments required at this time.';
      icon = 'check-circle';
    }
    
    // Update content
    const strongEl = document.createElement('strong');
    strongEl.textContent = title;
    
    const paragraphEl = document.createElement('p');
    paragraphEl.textContent = message;
    
    contentDiv.appendChild(strongEl);
    contentDiv.appendChild(paragraphEl);
    
    // Update icon
    if (iconElement) {
      iconElement.setAttribute('data-lucide', icon);
      try {
        lucide.createIcons({
          icons: {
            [icon]: iconElement
          }
        });
      } catch (iconError) {
        console.warn('Error creating icon:', iconError);
      }
    }
  } catch (error) {
    console.error('Error updating recommendation:', error);
  }
}

// Update the PID chart with new data
function updatePIDChart(chartData) {
  try {
    const chartCanvas = document.getElementById('pidChart');
    if (!chartCanvas) {
      console.error('Chart canvas element not found');
      return;
    }
    
    // Increase chart size
    const chartContainer = chartCanvas.parentElement;
    if (chartContainer) {
      chartContainer.style.height = '500px'; // Increase chart height
      chartContainer.style.marginBottom = '2rem'; // Add some margin below
    }
    
    const ctx = chartCanvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    // Safely destroy existing chart if it exists
    if (window.pidChart) {
      try {
        if (typeof window.pidChart.destroy === 'function') {
          window.pidChart.destroy();
        }
      } catch (destroyError) {
        console.warn('Error destroying existing chart:', destroyError);
        delete window.pidChart;
      }
    }
    
    // Verify Chart is defined
    if (typeof Chart === 'undefined') {
      console.error('Chart.js library is not loaded');
      return;
    }
    
    // Optimize data to improve performance
    const optimizedData = optimizeChartData(chartData);
    
    // Prepare datasets with improved colors
    const datasets = [
      {
        label: 'Setpoint',
        data: optimizedData.setpoint,
        borderColor: '#F0B429', // Dark yellow for setpoint
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        order: 2
      },
      {
        label: 'Process Value',
        data: optimizedData.actual,
        borderColor: '#2D7FF9', // Blue for process value
        backgroundColor: 'rgba(45, 127, 249, 0.1)',
        borderWidth: 2,
        pointRadius: 0, // No points for smoother line
        fill: false,
        tension: 0.4,
        order: 1
      },
      {
        label: 'Upper Error Margin',
        data: optimizedData.upperBound,
        borderColor: '#555555', // Darker gray for upper margin
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 3
      },
      {
        label: 'Lower Error Margin',
        data: optimizedData.lowerBound,
        borderColor: '#555555', // Darker gray for lower margin
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(85, 85, 85, 0.05)', // Subtle fill between margins
        tension: 0,
        order: 4
      }
    ];
    
    // Add Issue Points dataset if available - use scatter chart type for better visibility
    if (optimizedData.issuePoints && optimizedData.issuePoints.length > 0) {
      console.log('Adding issue points to chart:');
      
      // Create scatter plot data for issue points
      const scatterData = optimizedData.issuePoints.map((value, index) => {
        if (value !== null) {
          return {
            x: optimizedData.timeLabels[index],
            y: value
          };
        }
        return null;
      }).filter(point => point !== null);
      
      datasets.push({
          type: 'scatter',
          label: 'Issue Points',
          data: scatterData,
          borderColor: 'rgba(225, 45, 57, 0.6)',       // Semi-transparent red border
          backgroundColor: 'rgba(225, 45, 57, 0.2)',   // 20% transparent red fill
          borderWidth: 0.5,                            // Thinner border
          pointRadius: 3,                              // Bigger dot for visibility
          pointHoverRadius: 10,                        // Slightly larger on hover
          pointStyle: 'circle',                        // Circle shape
          order: 0
        });
      
      
      // Update details to show issue count
      updatePIDDetails(optimizedData);
    }
    
    // Improved Chart configuration with better visuals
    const chartConfig = {
      type: 'line',
      data: {
        labels: optimizedData.timeLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        animation: {
          duration: 0 // Disable animation for better performance
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              boxWidth: 12,
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 10,
            cornerRadius: 4,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(2);
                  if (!label.includes('Issue')) {
                    label += ' °C';
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time',
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 10
              },
              maxTicksLimit: 12 // Limit the number of ticks for better readability
            }
          },
          y: {
            title: {
              display: true,
              text: 'Temperature (°C)',
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            min: Math.min(...optimizedData.actual.filter(Boolean)) - 10,
            max: Math.max(...optimizedData.upperBound.filter(Boolean)) + 10,
            ticks: {
              stepSize: 10,
              font: {
                size: 10
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        }
      }
    };
    
    // Create the chart with try-catch
    try {
      window.pidChart = new Chart(ctx, chartConfig);
    } catch (chartError) {
      console.error('Error creating chart:', chartError);
      showToast('error', 'Failed to create chart');
    }
  } catch (error) {
    console.error('Error in updatePIDChart:', error);
  }
}

// Optimize chart data to improve performance
function optimizeChartData(chartData) {
  // If we have more than 200 data points, downsample the data
  if (chartData.timeLabels.length > 200) {
    const factor = Math.ceil(chartData.timeLabels.length / 150); // Keep around 150 points
    
    console.log(`Optimizing chart data: downsampling by factor of ${factor}`);
    
    const optimized = {
      timeLabels: [],
      setpoint: [],
      actual: [],
      upperBound: [],
      lowerBound: [],
      issuePoints: []
    };
    
    // Preserve issue points
    const originalIssuePoints = chartData.issuePoints || [];
    const preservedIssueIndices = new Set();
    
    // Find indices with issues so we always include them
    if (originalIssuePoints.length > 0) {
      originalIssuePoints.forEach((point, index) => {
        if (point !== null) {
          preservedIssueIndices.add(index);
        }
      });
    }
    
    // Downsample the data while preserving issue points
    for (let i = 0; i < chartData.timeLabels.length; i++) {
      // Always include the first and last point, plus issue points and evenly spaced samples
      if (i === 0 || 
          i === chartData.timeLabels.length - 1 || 
          preservedIssueIndices.has(i) || 
          i % factor === 0) {
        
        optimized.timeLabels.push(chartData.timeLabels[i]);
        optimized.setpoint.push(chartData.setpoint[i]);
        optimized.actual.push(chartData.actual[i]);
        
        if (chartData.upperBound) {
          optimized.upperBound.push(chartData.upperBound[i]);
        }
        
        if (chartData.lowerBound) {
          optimized.lowerBound.push(chartData.lowerBound[i]);
        }
        
        if (originalIssuePoints.length > 0) {
          optimized.issuePoints.push(originalIssuePoints[i]);
        }
      }
    }
    
    console.log(`Optimized data points from ${chartData.timeLabels.length} to ${optimized.timeLabels.length}`);
    return optimized;
  }
  
  return chartData;
}

function updatePIDDetails(chartData) {
  try {
    // Get the details container
    const detailsContainer = document.getElementById('pid-details');
    if (!detailsContainer) return;
    
    // Calculate issue count
    let issueCount = 0;
    if (chartData.issuePoints) {
      chartData.issuePoints.forEach(point => {
        if (point !== null) issueCount++;
      });
    }
    
    // Calculate standard deviation of measured values
    const values = chartData.actual.filter(val => val !== null && val !== undefined);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(variance).toFixed(2);
    
    // Create the details HTML
    const detailsHTML = `
      <div class="details-section">
        <h3>Performance Metrics</h3>
        <div class="details-row">
          <div class="detail-item">
            <span class="detail-label">Standard Deviation:</span>
            <span class="detail-value">${stdDev} °C</span>
          </div>
        </div>
      </div>
    `;
    
    // Add the details to the container
    if (!detailsContainer.querySelector('.details-section')) {
      detailsContainer.innerHTML += detailsHTML;
    } else {
      // Update existing details
      const stdDevValue = detailsContainer.querySelector('.detail-value');
      const issueValue = detailsContainer.querySelectorAll('.detail-value')[1];
      
      if (stdDevValue) stdDevValue.textContent = `${stdDev} °C`;
      if (issueValue) {
        issueValue.textContent = issueCount;
        if (issueCount > 0) {
          issueValue.classList.add('error-warning');
        } else {
          issueValue.classList.remove('error-warning');
        }
      }
    }
  } catch (error) {
    console.error('Error updating PID details:', error);
  }
}

// Set up event listeners for buttons
function setupActionButtons() {
  // Apply tuning button
  const applyTuningButton = document.getElementById('apply-tuning');
  if (applyTuningButton) {
    applyTuningButton.addEventListener('click', () => {
      applyTuningParameters();
    });
  }
  
  // Reset tuning button
  const resetTuningButton = document.getElementById('reset-tuning');
  if (resetTuningButton) {
    resetTuningButton.addEventListener('click', () => {
      resetTuningParameters();
    });
  }
  
  // Simulator toggle button
  const simulatorToggleButton = document.getElementById('simulator-toggle');
  if (simulatorToggleButton) {
    simulatorToggleButton.addEventListener('click', () => {
      openSimulator();
    });
  }
  
  // Close simulator button
  const closeSimulatorButton = document.getElementById('close-simulator');
  if (closeSimulatorButton) {
    closeSimulatorButton.addEventListener('click', () => {
      closeSimulator();
    });
  }
}


function openSimulator() {
  console.log('Opening PID simulator');
  
  // First, ensure the simulator script is loaded
  if (!document.getElementById('pid-simulator-script')) {
    const simulatorScript = document.createElement('script');
    simulatorScript.id = 'pid-simulator-script';
    simulatorScript.src = 'pid-simulator.js';
    document.head.appendChild(simulatorScript);
    
    // Create sample chart data
    const sampleData = createSamplePIDData();
    
    // Open simulator after a small delay to ensure script loads
    setTimeout(() => {
      if (window.pidSimulator && window.pidSimulator.openSimulator) {
        window.pidSimulator.openSimulator(sampleData);
      } else {
        showToast('error', 'Failed to load simulator');
      }
    }, 300);
  } else {
    // Script already loaded, prepare sample data
    const sampleData = createSamplePIDData();
    
    // Open the simulator with sample data
    if (window.pidSimulator && window.pidSimulator.openSimulator) {
      window.pidSimulator.openSimulator(sampleData);
    } else {
      showToast('error', 'Simulator not available');
    }
  }
}

// Function to create sample PID data
function createSamplePIDData() {
  // If we have real PID data from the app, use that
  if (window.currentPIDData) {
    console.log('Using existing PID data for simulation');
    return window.currentPIDData;
  }
  
  console.log('Creating sample PID data for simulation');
  
  // Generate sample data
  const timestamps = [];
  const setpointValues = [];
  const actualValues = [];
  const finetunedValues = [];
  
  // Generate 100 data points
  const setpoint = 540; // Temperature setpoint in °C
  for (let i = 0; i < 100; i++) {
    timestamps.push(i);
    setpointValues.push(setpoint);
    
    // Generate actual values with some oscillation
    if (i < 20) {
      actualValues.push(Math.min(setpoint, i * 30)); // Ramp up
    } else {
      const oscillation = Math.sin(i * 0.1) * 15;
      actualValues.push(setpoint + oscillation); // Oscillate around setpoint
    }
    
    // Generate finetuned values (better performance than actual)
    if (i < 15) {
      finetunedValues.push(Math.min(setpoint, i * 40)); // Faster ramp up
    } else {
      const oscillation = Math.sin(i * 0.1) * 5; // Less oscillation
      finetunedValues.push(setpoint + oscillation);
    }
  }
  
  // Return the sample data in expected format
  return {
    name: "Sample PID Controller",
    setpoint: `${setpoint}°C`,
    parameters: {
      open_loop: { kp: 1.2, ki: 0.5, kd: 0.1 },
      closed_loop: { kp: 0.5, ki: 0.3, kd: 0.1 }
    },
    suggestedParameters: {
      open_loop: { kp: 1.1, ki: 0.6, kd: 0.15 },
      closed_loop: { kp: 0.6, ki: 0.4, kd: 0.15 }
    },
    chartData: {
      timeLabels: timestamps,
      setpoint: setpointValues,
      actual: actualValues,
      finetuned: finetunedValues
    }
  };
}

// Function to close the simulator
function closeSimulator() {
  if (window.pidSimulator) {
    window.pidSimulator.closeSimulator();
  } else {
    const simulatorModal = document.getElementById('simulator-modal');
    if (simulatorModal) {
      simulatorModal.style.display = 'none';
      simulatorModal.classList.remove('show');
    }
  }
}


// Apply tuning parameters
function applyTuningParameters() {
  // In a real application, this would send the parameters to the control system
  
  // Prepare for API call
  showToast('info', 'Applying tuning parameters...');
  
  // Get suggested values
  const suggestedKpOpen = document.getElementById('suggested-kp-open')?.textContent;
  const suggestedKiOpen = document.getElementById('suggested-ki-open')?.textContent;
  const suggestedKdOpen = document.getElementById('suggested-kd-open')?.textContent;
  
  const suggestedKpClosed = document.getElementById('suggested-kp-closed')?.textContent;
  const suggestedKiClosed = document.getElementById('suggested-ki-closed')?.textContent;
  const suggestedKdClosed = document.getElementById('suggested-kd-closed')?.textContent;
  
  // Check if values are available
  if (!suggestedKpOpen || suggestedKpOpen === '-' || !suggestedKpClosed || suggestedKpClosed === '-') {
    showToast('error', 'No suggested parameters available');
    return;
  }
  
  // Prepare API payload (in real app, this would be sent to backend)
  const payload = {
    parameters: {
      open_loop: {
        kp: suggestedKpOpen,
        ki: suggestedKiOpen,
        kd: suggestedKdOpen
      },
      closed_loop: {
        kp: suggestedKpClosed,
        ki: suggestedKiClosed,
        kd: suggestedKdClosed
      }
    },
    timestamp: new Date().toISOString()
  };
  console.log(":::::::::1223:::::::")
  console.log(payload)
  
  // Make the API call to apply parameters
  fetch(`${API_BASE_URL}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Parameters applied successfully:', data);
    
    // Update UI with new parameters
    updateUIAfterParameterApplication(payload.parameters);
    
    // Show success message
    showToast('success', 'Tuning parameters applied successfully');
  })
  .catch(error => {
    console.error('Error applying parameters:', error);
    showToast('error', 'Failed to apply parameters: ' + error.message);
  });
}

// Update UI after successful parameter application
function updateUIAfterParameterApplication(parameters) {
  // Update current values with the new parameters
  const currentKpOpen = document.getElementById('current-kp-open');
  const currentKiOpen = document.getElementById('current-ki-open');
  const currentKdOpen = document.getElementById('current-kd-open');
  
  const currentKpClosed = document.getElementById('current-kp-closed');
  const currentKiClosed = document.getElementById('current-ki-closed');
  const currentKdClosed = document.getElementById('current-kd-closed');
  
  // Update open loop parameters
  if (parameters.open_loop) {
    if (currentKpOpen) currentKpOpen.textContent = parameters.open_loop.kp;
    if (currentKiOpen) currentKiOpen.textContent = parameters.open_loop.ki;
    if (currentKdOpen) currentKdOpen.textContent = parameters.open_loop.kd;
  }
  
  // Update closed loop parameters
  if (parameters.closed_loop) {
    if (currentKpClosed) currentKpClosed.textContent = parameters.closed_loop.kp;
    if (currentKiClosed) currentKiClosed.textContent = parameters.closed_loop.ki;
    if (currentKdClosed) currentKdClosed.textContent = parameters.closed_loop.kd;
  }
  
  // Clear suggestions
  const suggestedElements = [
    'suggested-kp-open', 'suggested-ki-open', 'suggested-kd-open',
    'suggested-kp-closed', 'suggested-ki-closed', 'suggested-kd-closed'
  ];
  
  suggestedElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = '-';
  });
  
  // Disable buttons
  const applyButton = document.getElementById('apply-tuning');
  const resetButton = document.getElementById('reset-tuning');
  
  if (applyButton) applyButton.disabled = true;
  if (resetButton) resetButton.disabled = true;
  
  // Update status indicator
  const statusElement = document.getElementById('pid-status');
  if (statusElement) {
    statusElement.textContent = 'Normal';
    statusElement.className = 'status-value normal';
  }
  
  // Update recommendation
  updateRecommendation('normal');
}

// Reset tuning parameters suggestions
// function resetTuningParameters() {
//   // Clear all suggested values
//   const elements = [
//     'suggested-kp-open', 'suggested-ki-open', 'suggested-kd-open',
//     'suggested-kp-closed', 'suggested-ki-closed', 'suggested-kd-closed'
//   ];
  
//   elements.forEach(id => {
//     const element = document.getElementById(id);
//     if (element) element.textContent = '-';
//   });
  
//   // Disable buttons
//   const applyButton = document.getElementById('apply-tuning');
//   const resetButton = document.getElementById('reset-tuning');
  
//   if (applyButton) applyButton.disabled = true;
//   if (resetButton) resetButton.disabled = true;
  
//   showToast('info', 'Suggested parameters reset');
// }

document.addEventListener('DOMContentLoaded', function() {
  const viewReportsButton = document.getElementById('viewReports');
  if (viewReportsButton) {
    viewReportsButton.addEventListener('click', function() {
      toggleSummaryReportsView();
    });
  }
});



// Function to toggle the reports view

// Function to toggle the summary reports view
function toggleSummaryReportsView() {
  console.log('Showing summary reports view');
  
  const summaryReportsView = document.getElementById('summary-reports-view');
  const feedbackView = document.getElementById('feedback-view');
  const initialSelectionMessage = document.getElementById('initial-selection-message');
  const pidDetailView = document.getElementById('pid-detail-view');
  
  if (summaryReportsView) {
    // Hide ALL other views
    if (feedbackView) feedbackView.style.display = 'none';
    if (initialSelectionMessage) initialSelectionMessage.style.display = 'none';
    if (pidDetailView) pidDetailView.style.display = 'none';
    
    // Show summary reports view
    summaryReportsView.style.display = 'block';
    
    // Load tuning activities
    loadTuningActivities();
  }
}

// Function to toggle the feedback view
function toggleFeedbackView() {
  console.log('Showing feedback view');
  
  const summaryReportsView = document.getElementById('summary-reports-view');
  const feedbackView = document.getElementById('feedback-view');
  const initialSelectionMessage = document.getElementById('initial-selection-message');
  const pidDetailView = document.getElementById('pid-detail-view');
  
  if (feedbackView) {
    // Hide ALL other views
    if (summaryReportsView) summaryReportsView.style.display = 'none';
    if (initialSelectionMessage) initialSelectionMessage.style.display = 'none';
    if (pidDetailView) pidDetailView.style.display = 'none';
    
    // Show feedback view
    feedbackView.style.display = 'block';
  } else {
    console.error('Feedback view element not found!');
  }
}

// Function to load tuning activities (summary reports)
function loadTuningActivities() {
  console.log('Loading tuning activities');
  
  // Show loading indicator
  const tuningActivitiesBody = document.getElementById('tuning-activities-body');
  if (tuningActivitiesBody) {
    tuningActivitiesBody.innerHTML = '<tr><td colspan="3" class="loading-message">Loading tuning activities...</td></tr>';
  }
  
  // For now, just use sample data directly
  setTimeout(() => {
    // Get sample data
    const sampleData = getSampleTuningData();
    
    // Populate the table
    populateTuningActivitiesTable(sampleData);
  }, 500); // Brief delay to simulate loading
}

// Function to populate the tuning activities table
function populateTuningActivitiesTable(data) {
  const tuningActivitiesBody = document.getElementById('tuning-activities-body');
  if (!tuningActivitiesBody) return;
  
  // Clear existing content
  tuningActivitiesBody.innerHTML = '';
  
  // Add table rows from the sample data
  if (data && data.activities && data.activities.length > 0) {
    data.activities.forEach(activity => {
      const row = document.createElement('tr');
      
      // Controller cell
      const controllerCell = document.createElement('td');
      controllerCell.textContent = activity.controller || 'N/A';
      row.appendChild(controllerCell);
      
      // Last Tuned cell
      const StatusCell = document.createElement('td');
      StatusCell.textContent = activity.Status || 'N/A';
      if (activity.Status && activity.Status.toLowerCase() !== 'normal') {
        StatusCell.className = 'status-alert';
      } else {
        StatusCell.className = 'status-normal';
      }
      
      row.appendChild(StatusCell); 
      
      // Tuner cell
      //  
      // recommendation cell
      const recommendationCell = document.createElement('td');
      recommendationCell.textContent = activity.recommendation || 'N/A';
      row.appendChild(recommendationCell)
      
      // Apply red color for non-normal status
      // if (activity.Status && activity.Status.toLowerCase() !== 'normal') {
      //   StatusCell.className = 'status-alert';
      // } else {
      //   StatusCell.className = 'status-normal';
      // }
      
      // row.appendChild(StatusCell);
      
      tuningActivitiesBody.appendChild(row);
    });
  } else {
    // No data message
    const noDataRow = document.createElement('tr');
    const noDataCell = document.createElement('td');
    noDataCell.colSpan = 3;
    noDataCell.textContent = 'No tuning activities available';
    noDataCell.className = 'loading-message';
    noDataRow.appendChild(noDataCell);
    tuningActivitiesBody.appendChild(noDataRow);
  }
  
  // Set up download button
  setupDownloadButton(data);
}

// Function to set up the download button
function setupDownloadButton(data) {
  const downloadButton = document.getElementById('download-report');
  if (!downloadButton) return;
  
  // Add event listener to download button
  downloadButton.addEventListener('click', () => {
    downloadTuningReport(data);
  });
}

// Function to get sample tuning data (for demo purposes)
function getSampleTuningData() {
  // Sample data structure for tuning activities
  return {
    activities: [
      {
        controller: 'Boiler_superHeater_LHS_1_stage_P_PID',
        Status: 'PID1 Settling time issue',
        // tuner: 'John Smith',
        recommendation: 'increase kp and ki for pid1 for better steady state tracking'
      },
      {
        controller: 'Boiler_superHeater_LHS_2_stage_P_PID',
        Status: 'PID1 oscillations',
        //  tuner: 'Emma Johnson',
        recommendation: 'reduce kp of pid1 and increase KD to dampen oscillations'
      },
      {
        controller: 'Boiler_superHeater_RHS_1_stage_P_PID',
        Status: 'PID1 oscillations',
        // tuner: 'Robert Chen',
        recommendation: 'reduce kp of pid1 and increase KD to dampen oscillations'
      },
      {
        controller: 'Boiler_superHeater_RHS_2_stage_P_PID',
        Status: 'PID1 Settling time issue',
        // tuner: 'Maria Garcia',
        recommendation: 'increase kp and ki for pid1 for better steady state tracking'
      },
      {
        controller: 'Boiler_reheater_RHS_1_stage_P_PID',
        Status: 'PID1 oscillations',
        // tuner: 'Alex Kim',
        recommendation: 'reduce kp of pid1 and increase KD to dampen oscillations'
      },
      {
        controller: 'Boiler_reheater_RHS_2_stage_P_PID',
        Status: 'PID1 oscillations',
        // tuner: 'Alex Kim',
        recommendation: 'reduce kp of pid1 and increase KD to dampen oscillations'
      }
    ],
    timestamp: new Date().toISOString(),
    summary: {
      totalControllers: "",
      normalControllers: "",
      alertControllers: ""
    }
  };
}

// Function to download tuning report
function downloadTuningReport(data) {
  console.log('Downloading tuning report');
  
  // Show toast message
  showToast('info', 'Preparing download...');
  
  try {
    // Convert data to CSV format
    const csvContent = convertReportToCSV(data);
    
    // Create a Blob containing the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a temporary link element
    const link = document.createElement('a');
    
    // Create the download URL
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', `pid_tuning_report_${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    
    // Add link to document
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show success message
    showToast('success', 'Report downloaded successfully');
  } catch (error) {
    console.error('Error downloading report:', error);
    showToast('error', 'Failed to download report');
  }
}

// Helper function to convert report data to CSV
function convertReportToCSV(data) {
  if (!data || !data.activities || !Array.isArray(data.activities)) {
    throw new Error('Invalid report data');
  }
  
  // CSV header
  let csvContent = 'Controller,Status,recommendation\n';
  
  // Add each row
  data.activities.forEach(activity => {
    // Escape fields that might contain commas
    const controller = `"${(activity.controller || '').replace(/"/g, '""')}"`;
    const Status = `"${(activity.Status || '').replace(/"/g, '""')}"`;
    // const tuner = `"${(activity.tuner || '').replace(/"/g, '""')}"`;
    const recommendation = `"${(activity.recommendation || '').replace(/"/g, '""')}"`;
    
    // Add row to CSV
    csvContent += `${controller},${Status},${recommendation}\n`;
  });
  
  // Add summary information
  if (data.summary) {
    csvContent += '\nSummary Information\n';
    csvContent += `Total Controllers,${data.summary.totalControllers || 0}\n`;
    csvContent += `Normal Controllers,${data.summary.normalControllers || 0}\n`;
    csvContent += `Alert Controllers,${data.summary.alertControllers || 0}\n`;
  }
  
  // Add timestamp
  csvContent += `\nReport Generated,${formatDate(new Date())}\n`;
  
  return csvContent;
}

function toggleFeedbackView() {
  console.log('Showing feedback view');
  
  const summaryReportsView = document.getElementById('summary-reports-view');
  const feedbackView = document.getElementById('feedback-view');
  const initialSelectionMessage = document.getElementById('initial-selection-message');
  const pidDetailView = document.getElementById('pid-detail-view');
  
  if (feedbackView) {
    // Hide other views
    if (summaryReportsView) summaryReportsView.style.display = 'none';
    if (initialSelectionMessage) initialSelectionMessage.style.display = 'none';
    if (pidDetailView) pidDetailView.style.display = 'none';
    
    // Toggle feedback view
    feedbackView.style.display = 'block';
  } else {
    console.error('Feedback view element not found!');
  }
}


// Helper function to format date for filenames
// Helper function to format date for filenames
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

// Feedback Form Validation Functions
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^[6-9][0-9]{9}$/;
  return phoneRegex.test(phone);
}

function handleFeedback(event) {
  event.preventDefault(); // Prevent default form submission

  const form = event.target;
  const name = form.name.value.trim();
  const site = form.site.value.trim();
  const department = form.department.value.trim();
  const email = form.email.value.trim();
  const phone = form.phone.value.trim();
  const feedback = form.feedback.value.trim();

  // Required field validation
  if (!name || !site || !department || !email || !phone || !feedback) {
    showToast('error', "Please fill in all the required fields.");
    return;
  }

  // Email and phone format validation
  if (!validateEmail(email)) {
    showToast('error', "Please enter a valid email address.");
    return;
  }

  if (!validatePhone(phone)) {
    showToast('error', "Please enter a valid phone number (10 digits, starting with 6-9).");
    return;
  }

  // Hide form and show thank you message
  document.getElementById('form-container').style.display = 'none';
  document.getElementById('thank-you-message').style.display = 'block';

  // Submit data (replace with real endpoint)
  console.log('Feedback submitted:', {
    name,
    site,
    department,
    email,
    phone,
    feedback,
    category: form.category.value
  });
  
  // In a real implementation, you would send this data to an API
  /*
  fetch('YOUR_API_ENDPOINT', {
    method: 'POST',
    body: new FormData(form),
  })
    .then(response => {
      if (response.ok) {
        console.log('Feedback sent successfully');
      } else {
        console.error('Failed to send feedback');
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  */
  
  // Show success message
  showToast('success', 'Feedback submitted successfully!');
}


// Toast notification system
function showToast(type, message) {
  try {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      console.warn('Toast container not found');
      return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon;
    switch (type) {
      case 'success':
        icon = 'check-circle';
        break;
      case 'error':
        icon = 'alert-circle';
        break;
      case 'warning':
        icon = 'alert-triangle';
        break;
      case 'info':
      default:
        icon = 'info';
        break;
    }
    
    toast.innerHTML = `
      <i data-lucide="${icon}" class="toast-icon"></i>
      <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    try {
      lucide.createIcons({
        icons: {
          [icon]: toast.querySelector(`[data-lucide="${icon}"]`)
        }
      });
    } catch (iconError) {
      console.warn('Error creating toast icon:', iconError);
    }
    
    // Show toast with animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }, 3000);
  } catch (error) {
    console.error('Error showing toast:', error);
  }
}

