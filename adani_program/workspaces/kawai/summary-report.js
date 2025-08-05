
// Summary Reports functionality

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // Initialize weather updates
    if (window.weatherAPI) {
      window.weatherAPI.init();
    }
    
    // Update current date and time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
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
    
    // Initialize summary chart
    initializeSummaryChart();
  });
  
  // Update date and time in header
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
  
  // Load PID hierarchy tree data
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
    } catch (error) {
      console.error('Failed to load PID hierarchy:', error);
      container.innerHTML = '<div class="error-message">Failed to load PID controllers hierarchy.</div>';
    }
  }
  
  // Icons for different node types
  const nodeIconMap = {
    "BOILER SYSTEM": "flame",
    "TURBINE SYSTEM": "wind", 
    "super_heater": "thermometer",
    "LHS": "layout-panel-left",
    "RHS": "layout-panel-right",
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
      if (key === 'primary_pid' || key === 'secondary_pid') {
        // PID controller node (leaf)
        const iconClass = key === 'primary_pid' ? 'primary-pid' : 'secondary-pid';
        
        html += `
          <li class="nav-item">
            <a href="#" class="nav-item-link" data-pid-path="${currentPath}">
              <i data-lucide="${icon}" class="${iconClass}"></i>
              <span>${displayName}</span>
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
          
          arrayHtml += `
            <li class="nav-item">
              <a href="#" class="nav-item-link" data-pid-path="${itemPath}">
                <i data-lucide="${itemIcon}" class="${itemIconClass}"></i>
                <span>${itemDisplayName}</span>
              </a>
            </li>
          `;
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
  }
  
  // Initialize summary chart
  function initializeSummaryChart() {
    const ctx = document.getElementById('summaryChart');
    if (!ctx) return;
    
    // Generate random system performance data
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const data = {
      labels: labels,
      datasets: [
        {
          label: 'PID Adjustments',
          data: labels.map(() => Math.floor(Math.random() * 20) + 5),
          backgroundColor: 'rgba(155, 135, 245, 0.4)',
          borderColor: 'rgba(155, 135, 245, 1)',
          borderWidth: 1
        },
        {
          label: 'Performance Score',
          data: labels.map(() => Math.floor(Math.random() * 30) + 60),
          backgroundColor: 'rgba(245, 135, 184, 0.4)',
          borderColor: 'rgba(245, 135, 184, 1)',
          borderWidth: 1
        },
        {
          label: 'Issues Detected',
          data: labels.map(() => Math.floor(Math.random() * 10)),
          backgroundColor: 'rgba(237, 137, 54, 0.4)',
          borderColor: 'rgba(237, 137, 54, 1)',
          borderWidth: 1
        }
      ]
    };
    
    new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#a0aec0'
            }
          }
        }
      }
    });
    
    // Show toast notification
    showToast('Summary reports loaded successfully', 'success');
  }
  
  // Toast notification system
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
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
    
    // Initialize Lucide icon
    lucide.createIcons({
      icons: {
        [icon]: toast.querySelector(`[data-lucide="${icon}"]`)
      }
    });
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }