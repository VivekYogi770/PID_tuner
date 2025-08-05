
/**
 * Main JavaScript for the Power Plant PID Control System
 */

 document.addEventListener('DOMContentLoaded', function() {
  // Initialize Lucide icons
  lucide.createIcons();
  
  // Get DOM elements
  const architectureTree = document.getElementById('architecture-tree');
  const overviewPanel = document.getElementById('overview-panel');
  const pidDetailPanel = document.getElementById('pid-detail');
  
  // Build the architecture tree
  buildArchitectureTree(architectureTree, architectureData);
  
  // Set up event listeners
  setupTreeEventListeners();
  
  // Show initial toast
  setTimeout(() => {
    showToast('info', 'System Ready', 'PID Control System is now ready.');
  }, 1000);
  
  /**
   * Build the architecture tree from data
   */
  function buildArchitectureTree(container, data, parentPath = '') {
    const treeHtml = document.createElement('div');
    treeHtml.className = 'tree';
    
    for (const key in data) {
      const item = data[key];
      const itemPath = parentPath ? `${parentPath}-${key}` : key;
      
      const treeItem = document.createElement('div');
      treeItem.className = 'tree-item';
      if (item.children) {
        treeItem.classList.add('has-children');
      }
      treeItem.setAttribute('data-path', itemPath);
      
      // Create the header of the tree item
      const treeItemHeader = document.createElement('div');
      treeItemHeader.className = 'tree-item-header';
      
      // Icon
      const icon = document.createElement('div');
      icon.className = 'tree-icon';
      const iconElement = document.createElement('i');
      iconElement.setAttribute('data-lucide', item.icon || 'folder');
      icon.appendChild(iconElement);
      treeItemHeader.appendChild(icon);
      
      // Expand icon for items with children
      if (item.children) {
        const chevron = document.createElement('div');
        chevron.className = 'tree-icon chevron';
        const chevronIcon = document.createElement('i');
        chevronIcon.setAttribute('data-lucide', 'chevron-right');
        chevron.appendChild(chevronIcon);
        treeItemHeader.appendChild(chevron);
      }
      
      // Text
      const text = document.createElement('div');
      text.className = 'text';
      text.textContent = item.name;
      treeItemHeader.appendChild(text);
      
      // Status indicator for PIDs
      if (item.type === 'pid') {
        const status = document.createElement('div');
        status.className = `status-indicator ${item.status}`;
        treeItemHeader.appendChild(status);
      }
      
      treeItem.appendChild(treeItemHeader);
      
      // Create children container if there are children
      if (item.children) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        buildArchitectureTree(childrenContainer, item.children, itemPath);
        treeItem.appendChild(childrenContainer);
      }
      
      treeHtml.appendChild(treeItem);
    }
    
    container.appendChild(treeHtml);
    
    // Re-initialize icons after adding elements to DOM
    lucide.createIcons();
  }
  
  /**
   * Set up event listeners for tree items
   */
  function setupTreeEventListeners() {
    const treeItems = document.querySelectorAll('.tree-item');
    
    treeItems.forEach(item => {
      const header = item.querySelector('.tree-item-header');
      
      header.addEventListener('click', () => {
        const path = item.getAttribute('data-path');
        const nodeData = getNodeByPath(architectureData, path);
        
        // If it's a PID node, select it and show details
        if (nodeData && nodeData.type === 'pid') {
          // Remove selection from other items
          document.querySelectorAll('.tree-item.selected').forEach(selected => {
            selected.classList.remove('selected');
          });
          
          // Add selection to this item
          item.classList.add('selected');
          
          // Show PID details
          showPIDDetails(nodeData, path);
        } 
        // If it's a branch node, toggle expansion
        else if (item.classList.contains('has-children')) {
          item.classList.toggle('expanded');
        }
      });
    });
    
    // Initially expand top-level items
    document.querySelectorAll('.tree > .tree-item').forEach(item => {
      item.classList.add('expanded');
    });
  }
  
  /**
   * Get a node from the architecture data by its path
   */
  function getNodeByPath(data, path) {
    const parts = path.split('-');
    let current = data;
    
    for (const part of parts) {
      if (current[part]) {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return current;
  }
  
  /**
   * Show PID controller details in the detail panel
   */
  function showPIDDetails(pidData, path) {
    // Hide overview panel and show PID detail panel
    overviewPanel.classList.remove('active');
    pidDetailPanel.classList.add('active');
    
    // Extract information from the path to build the PID name
    const pathParts = path.split('-');
    
    // Build a more descriptive path
    let fullPath = '';
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      currentPath += (i > 0 ? '-' : '') + pathParts[i];
      const node = getNodeByPath(architectureData, currentPath);
      fullPath += (i > 0 ? ' > ' : '') + node.name;
    }
    
    // Determine status text based on PID status
    let statusText = 'Normal';
    let statusClass = 'success';
    let issueText = 'No issues detected.';
    let recommendation = 'No tuning adjustments required.';
    
    if (pidData.status === 'error') {
      statusText = 'Error';
      statusClass = 'error';
      issueText = 'High oscillation detected in control loop with long settling time.';
      recommendation = 'Decrease proportional gain (Kp) by 20% and increase derivative time to reduce oscillations.';
    } else if (pidData.status === 'warning') {
      statusText = 'Warning';
      statusClass = 'warning';
      issueText = 'Mild oscillations with occasional overshoot observed.';
      recommendation = 'Consider slight reduction in proportional gain (Kp) by 10%.';
    }
    
    // Generate mock PID controller data
    const kp = (Math.random() * 2 + 1).toFixed(2);
    const ki = (Math.random() * 0.5).toFixed(2);
    const kd = (Math.random() * 0.2).toFixed(2);
    
    // Generate suggested tuning values if there's an issue
    const suggestedKp = pidData.status !== 'success' ? (kp * (pidData.status === 'error' ? 0.8 : 0.9)).toFixed(2) : '-';
    const suggestedKi = pidData.status !== 'success' ? (ki * (pidData.status === 'error' ? 1.1 : 1.0)).toFixed(2) : '-';
    const suggestedKd = pidData.status !== 'success' ? (kd * (pidData.status === 'error' ? 1.5 : 1.2)).toFixed(2) : '-';
    
    // Mock current values
    const currentLoad = Math.floor(Math.random() * 30 + 70) + '%'; // 70-100%
    const errorMargin = (Math.random() * 0.4 + 0.1).toFixed(1) + '°C'; // 0.1-0.5°C
    const currentSetpoint = Math.floor(Math.random() * 20 + 530) + '°C'; // 530-550°C
    
    // Generate HTML for the PID detail panel with relevant sections
    pidDetailPanel.innerHTML = `
      <div class="pid-header">
        <div>
          <h2 class="pid-title">${fullPath}</h2>
          <div class="pid-tags">Tag ID: ${pidData.tags ? pidData.tags.measured : 'N/A'}</div>
        </div>
        <div class="pid-status">
          <div class="status-pill ${statusClass}">
            <span class="status-dot ${statusClass}"></span>
            <span>${statusText}</span>
          </div>
        </div>
      </div>
      
      <div class="status-panels">
        <div class="status-panel">
          <div class="status-title">Current Load</div>
          <div class="status-value">${currentLoad}</div>
        </div>
        <div class="status-panel">
          <div class="status-title">Error Margin</div>
          <div class="status-value">${errorMargin}</div>
        </div>
        <div class="status-panel">
          <div class="status-title">Current Setpoint</div>
          <div class="status-value">${currentSetpoint}</div>
        </div>
      </div>
      
      <div class="issue-panel ${pidData.status !== 'success' ? 'has-issue' : ''}">
        <div class="issue-icon">
          <i data-lucide="${pidData.status === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        </div>
        <div class="issue-content">
          <h3>System Status</h3>
          <p>${issueText}</p>
        </div>
      </div>
      
      <div class="pid-chart">
        <h3>Temperature vs Setpoint (Last 8 Hours)</h3>
        <canvas id="pidResponseChart"></canvas>
      </div>
      
      <div class="pid-params">
        <h3>PID Tuning Parameters</h3>
        <table class="params-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Current Value</th>
              <th>Suggested Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Proportional Gain (Kp)</td>
              <td>${kp}</td>
              <td>${suggestedKp}</td>
            </tr>
            <tr>
              <td>Integral Gain (Ki)</td>
              <td>${ki}</td>
              <td>${suggestedKi}</td>
            </tr>
            <tr>
              <td>Derivative Gain (Kd)</td>
              <td>${kd}</td>
              <td>${suggestedKd}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="recommendation-box">
          <h4>Recommendation</h4>
          <p>${recommendation}</p>
          ${pidData.status !== 'success' ? `
          <button class="button apply-tuning" id="apply-tuning">
            <i data-lucide="check"></i>
            Apply Tuning
          </button>` : ''}
        </div>
      </div>
      
      <div class="actions">
        <button class="button secondary" id="back-to-overview">
          <i data-lucide="arrow-left"></i>
          Back to Overview
        </button>
      </div>
    `;
    
    // Re-initialize Lucide icons for the new content
    lucide.createIcons();
    
    // Add event listener for the back button
    document.getElementById('back-to-overview').addEventListener('click', () => {
      pidDetailPanel.classList.remove('active');
      overviewPanel.classList.add('active');
    });
    
    // Add event listener for apply tuning button if it exists
    const applyTuningBtn = document.getElementById('apply-tuning');
    if (applyTuningBtn) {
      applyTuningBtn.addEventListener('click', () => {
        // Simulate API call to apply tuning parameters
        applyTuningBtn.disabled = true;
        applyTuningBtn.innerHTML = '<i data-lucide="loader"></i> Applying...';
        
        // Reinitialize the icon
        lucide.createIcons({ icons: ['loader'] });
        
        setTimeout(() => {
          showToast('success', 'Tuning Applied', 'New PID parameters have been successfully applied.');
          applyTuningBtn.innerHTML = '<i data-lucide="check"></i> Tuning Applied';
          applyTuningBtn.classList.add('success');
          
          // Reinitialize the icon
          lucide.createIcons({ icons: ['check'] });
        }, 1500);
      });
    }
    
    // Create a response chart
    createResponseChart(pidData.status !== 'success');
  }
  
  /**
   * Create a PID response chart
   */
  function createResponseChart(hasIssue) {
    const ctx = document.getElementById('pidResponseChart').getContext('2d');
    
    // Generate time labels for the past 8 hours
    const hours = [];
    const currentHour = new Date().getHours();
    
    for (let i = 8; i >= 0; i--) {
      let hour = currentHour - i;
      if (hour < 0) hour += 24;
      hours.push(`${hour}:00`);
    }
    
    // Generate setpoint data (constant or with a step change)
    const setpointData = Array(9).fill(540);
    if (Math.random() > 0.5) {
      // Add a step change mid-way
      for (let i = 4; i < 9; i++) {
        setpointData[i] = 550;
      }
    }
    
    // Generate process variable data based on issue status
    let processData;
    if (hasIssue) {
      // Problematic response with oscillations or drift
      processData = [];
      for (let i = 0; i < 9; i++) {
        // Base value with oscillations
        const oscillation = Math.sin(i * 1.2) * 10;
        const drift = (Math.random() - 0.5) * 5;
        processData.push(setpointData[i] + oscillation + drift);
      }
    } else {
      // Good response with minor variations
      processData = [];
      for (let i = 0; i < 9; i++) {
        // Small random variations around the setpoint
        const variation = (Math.random() - 0.5) * 3;
        processData.push(setpointData[i] + variation);
      }
    }
    
    // Create the chart
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Setpoint',
            data: setpointData,
            borderColor: '#3b82f6',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Process Variable',
            data: processData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            pointRadius: 2,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'rgba(255, 255, 255, 0.7)',
              font: {
                size: 12
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time (hours)',
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        }
      }
    });
  }
  
  /**
   * Show a toast notification
   */
  function showToast(type, title, message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'warning' ? 'alert-triangle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
      </div>
      <div class="toast-content">
        <h4 class="toast-title">${title}</h4>
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close">
        <i data-lucide="x"></i>
      </button>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Add event listener to close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('hiding');
      setTimeout(() => {
        toast.remove();
      }, 300);
    });
    
    // Show toast with animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 5000);
  }
});