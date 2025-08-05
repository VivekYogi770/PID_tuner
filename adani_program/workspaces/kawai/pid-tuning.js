/**
 * PID Tuning System - Main JavaScript
 * Handles dynamic loading of PID controllers, visualization,
 * and tuning parameter display
 */

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  lucide.createIcons();
  
  // Initialize weather updates
  if (window.weatherAPI) {
    window.weatherAPI.init();
  }
  
  // Initialize sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  
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

// Toggle between PID view and summary reports view
function toggleSummaryReportsView() {
  const pidDetailView = document.getElementById('pid-detail-view');
  const initialMessage = document.getElementById('initial-selection-message');
  const summaryReportsView = document.getElementById('summary-reports-view');
  
  if (summaryReportsView && summaryReportsView.style.display === 'none') {
    // Show summary reports view
    if (pidDetailView) pidDetailView.style.display = 'none';
    if (initialMessage) initialMessage.style.display = 'none';
    summaryReportsView.style.display = 'block';
    
    // Deselect any active PID in sidebar
    document.querySelectorAll('.nav-item-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Highlight the summary reports link
    const reportsLink = document.getElementById('summary-reports-link');
    if (reportsLink) reportsLink.classList.add('active');
    
    showToast('info', 'Viewing summary reports');
  } else if (summaryReportsView) {
    // Hide summary reports view
    summaryReportsView.style.display = 'none';
    if (initialMessage) initialMessage.style.display = 'block';
    
    const reportsLink = document.getElementById('summary-reports-link');
    if (reportsLink) reportsLink.classList.remove('active');
  }
}

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
  "BOILER SYSTEM": "flame",
  "TURBINE SYSTEM": "wind", 
  "super_heater": "thermometer",
  "reheater": "thermometer",
  "LHS": "panel-left",  // Changed from layout-panel-left
  "RHS": "panel-right", // Changed from layout-panel-right
  "First_stage": "layers",
  "Second_stage": "layers",
  "primary_pid": "activity",
  "secondary_pid": "activity",
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
      // For demo, add random status indicators
      const isHealthy = Math.random() > 0.3;
      const statusClass = isHealthy ? 'normal' : 'issue';
      
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
        const itemData = item[itemKey];
        const itemPath = `${currentPath}-${index}-${itemKey}`;
        const itemDisplayName = itemKey.replace(/_/g, ' ');
        const itemIcon = nodeIconMap[itemKey] || 'folder';
        const itemIconClass = itemKey === 'primary_pid' ? 'primary-pid' : 'secondary-pid';
        
        // Only add primary_pid items to the navigation
        if (itemKey === 'primary_pid') {
          // Generate random status (in real app, this would be determined by actual status)
          const hasIssue = Math.random() > 0.7;
          const statusClass = hasIssue ? 'issue' : 'normal';
          
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
      // Check if this object directly contains a primary_pid property
      if (value.primary_pid) {
        const statusClass = Math.random() > 0.7 ? 'issue' : 'normal';
        
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
        // Branch node with children
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

// Set up tree interactions
function setupTreeInteractions() {
  // Add click handlers for tree items with children
  const treeItems = document.querySelectorAll('.nav-item-link[data-tree-id]');
  treeItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const navItem = this.parentElement;
      navItem.classList.toggle('expanded');
    });
  });
  
  // Auto-expand first level items
  document.querySelectorAll('.nav-tree-list > .nav-item').forEach(item => {
    item.classList.add('expanded');
  });

  // Add click handlers for PID items
  const pidItems = document.querySelectorAll('.nav-item-link[data-pid-path]');
  pidItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const pidPath = this.getAttribute('data-pid-path');
      
      // Remove active class from all items
      document.querySelectorAll('.nav-item-link').forEach(link => {
        link.classList.remove('active');
      });
      
      // Add active class to selected item
      this.classList.add('active');
      
      // Hide summary reports view and show PID view
      const summaryView = document.getElementById('summary-reports-view');
      if (summaryView) summaryView.style.display = 'none';
      
      // Load PID data
      if (pidPath) {
        loadPIDData(pidPath);
      }
    });
  });
}

// Load PID data based on selected path
async function loadPIDData(pidPath) {
  // Safety check
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
    // First try to fetch data from API
    try {
      const pidData = await fetchPIDDataFromAPI(pidPath);
      if (pidData) {
        updatePIDView(pidData, pidPath);
        return;
      }
    } catch (apiError) {
      console.warn('API fetch failed, falling back to local data:', apiError);
    }
    
    // Fallback to local data if API is not available
    const response = await fetch('pid-architecture.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const architectureData = await response.json();
    console.log("::::::::I HAVE BEEN CALLED HERE")
    console.log("architectureData")
    console.log(pidPath)
    // Navigate the path to get PID data
    const pidConfig = getPIDDataFromPath(architectureData, pidPath);
    
    if (pidConfig) {
      // Generate mock data based on config
      const mockData = generateMockPIDData(pidConfig, pidPath);
      if (mockData) {
        updatePIDView(mockData, pidPath);
      } else {
        throw new Error('Failed to generate mock data');
      }
    } else {
      showToast('error', 'Failed to load PID data');
      console.error('PID data not found for path:', pidPath);
    }
  } catch (error) {
    console.error('Error loading PID data:', error);
    showToast('error', 'Error loading PID data');
  }
}

// Flag to control whether to use mock data or make actual API calls
// REPLACE THIS TO FALSE TO USE THE REAL API
const useMockData = false;

// API base URL for real data
// YOU SHOULD REPLACE THIS URL WITH YOUR ACTUAL BACKEND API URL
const API_BASE_URL = "http://127.0.0.1:5000/pidtest";

// Make real API call to the backend
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
    
    // Get the API response
    const apiResponse = await response.json();
    console.log('Raw API Response:', apiResponse);
    
    return apiResponse;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Create payload for PID API request
function createPIDApiPayload(pidPath) {
  // Parse PID path to get relevant information
  const pathParts = pidPath.split('-');
  const isPrimary = pathParts[pathParts.length - 1] === 'primary_pid';
  
  // Get current time minus 24 hours for the start time
  const endTime = new Date();
  const startTime = new Date(endTime);
  startTime.setHours(startTime.getHours() - 24);
  
  // Create the payload
  const payload = {
    pidPath: pidPath,
    isPrimary: isPrimary,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    // Include any additional parameters your API needs
    sampleInterval: 60, // Sample interval in minutes
    includeIssuePoints: true
  };
  
  console.log('Created API payload:', payload);
  return payload;
}

// Fetch PID data from API - updated to properly handle mock vs real data
async function fetchPIDDataFromAPI(pidPath) {
  console.log('Fetching PID data from API for path:', pidPath);
  
  if (useMockData) {
    // Use mock data with a simulated delay
    return new Promise((resolve, reject) => {
      // Simulate API request delay
      setTimeout(async () => {
        try {
          // For demo, randomly decide whether to "fail" the API call
          if (Math.random() > 0.7) {
            throw new Error('Simulated API failure');
          }
          
          // Get the local data as a fallback
          const response = await fetch('pid-architecture.json');
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const architectureData = await response.json();
          const pidConfig = getPIDDataFromPath(architectureData, pidPath);
          
          if (!pidConfig) {
            throw new Error('PID configuration not found');
          }
          
          // Generate mock data
          const mockAPIData = generateMockPIDData(pidConfig, pidPath);
          
          // Add API-specific fields
          if (mockAPIData) {
            mockAPIData.source = 'api';
            mockAPIData.timestamp = new Date().toISOString();
            resolve(mockAPIData);
          } else {
            reject(new Error('Could not generate mock data'));
          }
        } catch (error) {
          reject(error);
        }
      }, 800); // Simulate network delay
    });
  } else {
    // Use real API with actual backend endpoint
    try {
      // Create payload for API request
      const payload = createPIDApiPayload(pidPath);
      
      // Log the payload for debugging
      console.log('API Request Payload:', payload);
      
      // Make the actual API call
      const apiData = await fetchRealPIDData(API_BASE_URL, payload);
      
      // Transform API response to the expected format
      return transformApiResponse(apiData, pidPath);
    } catch (error) {
      console.error('Error fetching real PID data:', error);
      throw error;
    }
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
    
    // Extract values from API response
    const {
      setpoint = 540,
      errorMargin = 5,
      status = 'normal',
      parameters = {},
      suggestedParameters = null,
      chartData = {},
      tags = {}
    } = apiData;
    
    // Determine status class
    let statusClass = 'normal';
    let statusCondition = 'Normal';
    
    if (status === 'warning') {
      statusClass = 'warning';
      statusCondition = 'Warning';
    } else if (status === 'issue') {
      statusClass = 'issue';
      statusCondition = 'Issue Detected';
    }
    
    console.log('Chart data from API:', chartData);
    
    // Return transformed data
    return {
      name: displayPath,
      config: {
        tags: tags,
        parameters: parameters
      },
      status: {
        condition: statusCondition,
        class: statusClass
      },
      setpoint: `${setpoint}°C`,
      errorMargin: `±${errorMargin}°C`,
      tags: tags,
      parameters: parameters,
      suggestedParameters: suggestedParameters,
      chartData: {
        timeLabels: chartData.timestamps || [],
        setpoint: chartData.setpoint || [],
        actual: chartData.actual || chartData.measured || [],
        upperBound: chartData.upperBound || [],
        lowerBound: chartData.lowerBound || [],
        issuePoints: chartData.issuePoints || [] // Array of issue points
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
  console.log(":::CURRENT")
  console.log(current)
  return current;
}

// Generate mock PID data for visualization
function generateMockPIDData(pidConfig, pidPath) {
  if (!pidConfig || !pidPath) return null;
  
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
    
    // Current time for time-series data
    const currentTime = new Date();
    
    // Generate time labels for the past 24 hours
    const timeLabels = Array.from({length: 24}, (_, i) => {
      const time = new Date(currentTime);
      time.setHours(time.getHours() - (24 - i));
      return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });
    
    // Determine status randomly for demo purposes
    // In production, this would be based on actual controller performance
    const statusRandom = Math.random();
    let status, statusClass;
    
    if (statusRandom > 0.7) {
      status = 'Issue Detected';
      statusClass = 'issue';
    } else if (statusRandom > 0.4) {
      status = 'Warning';
      statusClass = 'warning';
    } else {
      status = 'Normal';
      statusClass = 'normal';
    }
    
    // For demo purposes, use fixed setpoint and error margin
    // In production, these would come from real-time data
    const setpoint = 540;
    const errorMargin = 5;
    
    // Generate actual temperature data based on status
    let actualTemps;
    
    if (statusClass === 'normal') {
      // Normal operation: temperature close to setpoint with small variations
      actualTemps = timeLabels.map(() => 
        setpoint + (Math.random() * errorMargin * 0.6) - (errorMargin * 0.3)
      );
    } else if (statusClass === 'warning') {
      // Warning: larger variations, occasional excursions beyond error margin
      actualTemps = timeLabels.map((_, i) => 
        setpoint + Math.sin(i * 0.5) * errorMargin * 1.1
      );
    } else {
      // Issue: significant oscillations or deviation from setpoint
      actualTemps = timeLabels.map((_, i) => {
        // Different pattern based on the hour to simulate different issues
        if (i % 2 === 0) {
          return setpoint + errorMargin * 1.5 * Math.sin(i * 0.8);
        } else {
          return setpoint - errorMargin * 1.2 * Math.cos(i * 0.6);
        }
      });
    }
    
    // Generate bounds (upper and lower error margins)
    const upperBound = Array(timeLabels.length).fill(setpoint + errorMargin);
    const lowerBound = Array(timeLabels.length).fill(setpoint - errorMargin);
    
    // Generate suggested parameters based on status
    // In production, these would be calculated based on control theory
    let suggestedParams = null;
    
    if (statusClass !== 'normal' && pidConfig.parameters) {
      // Get current parameters from the config
      const openLoopParams = pidConfig.parameters?.open_loop;
      const closedLoopParams = pidConfig.parameters?.closed_loop;
      
      if (openLoopParams && closedLoopParams) {
        // Generate suggested values (slightly adjusted from current)
        // In production, these would be calculated based on process dynamics
        suggestedParams = {
          open_loop: {
            kp: (parseFloat(openLoopParams.kp) * (1 + (Math.random() * 0.2 - 0.1))).toFixed(3),
            ki: (parseFloat(openLoopParams.ki) * (1 + (Math.random() * 0.2 - 0.1))).toFixed(3),
            kd: (parseFloat(openLoopParams.kd) * (1 + (Math.random() * 0.2 - 0.1))).toFixed(3)
          },
          closed_loop: {
            kp: (parseFloat(closedLoopParams.kp) * (1 + (Math.random() * 0.2 - 0.1))).toFixed(3),
            ki: (parseFloat(closedLoopParams.ki) * (1 + (Math.random() * 0.2 - 0.1))).toFixed(3),
            kd: (parseFloat(closedLoopParams.kd) * (1 + (Math.random() * 0.2 - 0.1))).toFixed(3)
          }
        };
      }
    }
    
    // Return comprehensive PID data object
    return {
      name: displayPath,
      config: pidConfig,
      status: {
        condition: status,
        class: statusClass
      },
      setpoint: `${setpoint}°C`,
      errorMargin: `±${errorMargin}°C`,
      tags: pidConfig.tags,
      parameters: pidConfig.parameters,
      suggestedParameters: suggestedParams,
      chartData: {
        timeLabels: timeLabels,
        setpoint: Array(timeLabels.length).fill(setpoint),
        actual: actualTemps,
        upperBound: upperBound,
        lowerBound: lowerBound
      }
    };
  } catch (error) {
    console.error('Error generating mock PID data:', error);
    return null;
  }
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
          tagsContainer.appendChild(tagElement);
        });
      }
    }
    
    // Update status panels
    const statusElement = document.getElementById('pid-status');
    if (statusElement && pidData.status) {
      statusElement.textContent = pidData.status.condition;
      statusElement.className = `status-value ${pidData.status.class}`;
    }
    
    const errorMarginElement = document.getElementById('pid-error-margin');
    if (errorMarginElement) errorMarginElement.textContent = pidData.errorMargin;
    
    const setpointElement = document.getElementById('pid-setpoint');
    if (setpointElement) setpointElement.textContent = pidData.setpoint;
    
    // Update parameters display
    if (pidData.parameters) {
      // Update open loop parameters
      const openLoop = pidData.parameters.open_loop;
      if (openLoop) {
        const kpOpenElement = document.getElementById('current-kp-open');
        const kiOpenElement = document.getElementById('current-ki-open');
        const kdOpenElement = document.getElementById('current-kd-open');
        
        if (kpOpenElement) kpOpenElement.textContent = openLoop.kp;
        if (kiOpenElement) kiOpenElement.textContent = openLoop.ki;
        if (kdOpenElement) kdOpenElement.textContent = openLoop.kd;
      }
      
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
    updateRecommendation(pidData.status ? pidData.status.class : 'normal');
    
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
function updateRecommendation(status) {
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
    
    switch (status) {
      case 'issue':
        title = 'Tuning adjustments required';
        message = 'Parameters outside optimal range. Consider applying suggested tuning values to improve performance.';
        icon = 'alert-triangle';
        break;
      case 'warning':
        title = 'Performance could be improved';
        message = 'Current parameters are functional but not optimal. Review suggested values for potential efficiency gains.';
        icon = 'alert-circle';
        break;
      default:
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
    
    const ctx = chartCanvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    // Safely destroy existing chart if it exists
    if (window.pidChart) {
      try {
        // Check if it's a valid Chart instance with destroy method
        if (typeof window.pidChart.destroy === 'function') {
          window.pidChart.destroy();
        }
      } catch (destroyError) {
        console.warn('Error destroying existing chart:', destroyError);
        // If destroy fails, delete the reference
        delete window.pidChart;
      }
    }
    
    // Verify Chart is defined
    if (typeof Chart === 'undefined') {
      console.error('Chart.js library is not loaded');
      return;
    }
    
    // Prepare datasets
    const datasets = [
      {
        label: 'Setpoint',
        data: chartData.setpoint,
        borderColor: '#9b87f5',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        order: 2
      },
      {
        label: 'Process Value',
        data: chartData.actual,
        borderColor: '#ea384c',
        backgroundColor: 'rgba(234, 56, 76, 0.1)',
        borderWidth: 2,
        pointRadius: 1,
        fill: false,
        tension: 0.4,
        order: 1
      },
      {
        label: 'Upper Error Margin',
        data: chartData.upperBound,
        borderColor: 'rgba(155, 135, 245, 0.5)',
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
        data: chartData.lowerBound,
        borderColor: 'rgba(155, 135, 245, 0.5)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(155, 135, 245, 0.05)',
        tension: 0,
        order: 4
      }
    ];
    
    // Add Issue Points dataset if available
    if (chartData.issuePoints && chartData.issuePoints.length > 0) {
      console.log('Adding issue points to chart:', chartData.issuePoints);
      datasets.push({
        label: 'Issue Points',
        data: chartData.issuePoints,
        borderColor: '#ff6b6b',
        backgroundColor: '#ff6b6b',
        borderWidth: 0,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointStyle: 'circle',
        showLine: false,
        order: 0
      });
      
      // Update details to show issue count
      updatePIDDetails(chartData);
    }
    
    // Chart configuration
    const chartConfig = {
      type: 'line',
      data: {
        labels: chartData.timeLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              boxWidth: 12,
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
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
                size: 12
              }
            },
            grid: {
              display: false
            }
          },
          y: {
            title: {
              display: true,
              text: 'Temperature (°C)',
              font: {
                size: 12
              }
            },
            min: Math.min(...chartData.actual.filter(Boolean)) - 10,
            max: Math.max(...chartData.actual.filter(Boolean)) + 10,
            ticks: {
              stepSize: 10
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

// Update PID details with statistical information
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
          <div class="detail-item">
            <span class="detail-label">Issue Points:</span>
            <span class="detail-value ${issueCount > 0 ? 'error-warning' : ''}">${issueCount}</span>
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

// Apply tuning parameters
function applyTuningParameters() {
  // In a real application, this would send the parameters to the control system
  
  // For demo, simulate API call
  showToast('info', 'Applying tuning parameters...');
  
  // Simulate network delay
  setTimeout(() => {
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
    
    console.log('Applying parameters:', payload);
    
    // Update current values with suggested values
    const currentKpOpen = document.getElementById('current-kp-open');
    const currentKiOpen = document.getElementById('current-ki-open');
    const currentKdOpen = document.getElementById('current-kd-open');
    
    const currentKpClosed = document.getElementById('current-kp-closed');
    const currentKiClosed = document.getElementById('current-ki-closed');
    const currentKdClosed = document.getElementById('current-kd-closed');
    
    if (currentKpOpen) currentKpOpen.textContent = suggestedKpOpen;
    if (currentKiOpen) currentKiOpen.textContent = suggestedKiOpen;
    if (currentKdOpen) currentKdOpen.textContent = suggestedKdOpen;
    
    if (currentKpClosed) currentKpClosed.textContent = suggestedKpClosed;
    if (currentKiClosed) currentKiClosed.textContent = suggestedKiClosed;
    if (currentKdClosed) currentKdClosed.textContent = suggestedKdClosed;
    
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
    
    // Show success message
    showToast('success', 'Tuning parameters applied successfully');
  }, 1000);
}

// Reset tuning parameters suggestions
function resetTuningParameters() {
  // Clear all suggested values
  const elements = [
    'suggested-kp-open', 'suggested-ki-open', 'suggested-kd-open',
    'suggested-kp-closed', 'suggested-ki-closed', 'suggested-kd-closed'
  ];
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = '-';
  });
  
  // Disable buttons
  const applyButton = document.getElementById('apply-tuning');
  const resetButton = document.getElementById('reset-tuning');
  
  if (applyButton) applyButton.disabled = true;
  if (resetButton) resetButton.disabled = true;
  
  showToast('info', 'Suggested parameters reset');
}

// Open PID simulator modal
function openSimulator() {
  const simulatorModal = document.getElementById('simulator-modal');
  if (simulatorModal) {
    simulatorModal.style.display = 'block';
    
    // Initialize simulator with current PID values
    initializeSimulator();
  }
}

// Close PID simulator modal
function closeSimulator() {
  const simulatorModal = document.getElementById('simulator-modal');
  if (simulatorModal) {
    simulatorModal.style.display = 'none';
  }
}

// Initialize simulator with current PID values
function initializeSimulator() {
  try {
    // Get current PID values from the main view
    const kpElement = document.getElementById('current-kp-closed');
    const kiElement = document.getElementById('current-ki-closed');
    const kdElement = document.getElementById('current-kd-closed');
    
    if (!kpElement || !kiElement || !kdElement) {
      console.warn('Missing parameter elements for simulator initialization');
      return;
    }
    
    const kp = parseFloat(kpElement.textContent);
    const ki = parseFloat(kiElement.textContent);
    const kd = parseFloat(kdElement.textContent);
    
    // Set simulator input values
    const simKpElement = document.getElementById('simulator-kp');
    const simKiElement = document.getElementById('simulator-ki');
    const simKdElement = document.getElementById('simulator-kd');
    
    if (simKpElement && !isNaN(kp)) simKpElement.value = kp;
    if (simKiElement && !isNaN(ki)) simKiElement.value = ki;
    if (simKdElement && !isNaN(kd)) simKdElement.value = kd;
    
    // Set setpoint from main view
    const setpointElement = document.getElementById('pid-setpoint');
    if (setpointElement) {
      const setpointText = setpointElement.textContent;
      const setpoint = parseInt(setpointText);
      
      const simSetpointElement = document.getElementById('simulator-setpoint');
      const setpointValueElement = document.getElementById('setpoint-value');
      
      if (simSetpointElement && !isNaN(setpoint)) simSetpointElement.value = setpoint;
      if (setpointValueElement && !isNaN(setpoint)) setpointValueElement.textContent = setpoint;
    }
    
    // Reset disturbance
    const simDisturbanceElement = document.getElementById('simulator-disturbance');
    const disturbanceValueElement = document.getElementById('disturbance-value');
    
    if (simDisturbanceElement) simDisturbanceElement.value = 0;
    if (disturbanceValueElement) disturbanceValueElement.textContent = 0;
    
    // Initialize simulator chart if needed
    if (typeof window.pidSimulator === 'object' && typeof window.pidSimulator.initialize === 'function') {
      window.pidSimulator.initialize();
    } else {
      console.warn('PID simulator module not loaded');
    }
  } catch (error) {
    console.error('Error initializing simulator:', error);
  }
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
    
    // Initialize Lucide icon with error handling
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