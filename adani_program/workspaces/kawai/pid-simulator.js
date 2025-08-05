document.addEventListener('DOMContentLoaded', () => {
  // This ensures we don't add duplicate event listeners
  if (window.simulatorInitialized) return;
  window.simulatorInitialized = true;
  
  // Initialize simulator variables
  let simulationChart = null;
  let animationFrame = null;
  let isAnimating = false;
  let animationProgress = 0;
  let startTime = null;
  
  // Add event listeners to simulator controls
  const closeModalBtn = document.getElementById('close-simulator');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeSimulator);
  }
  
  // Modal click event to close when clicking outside content
  const simulatorModal = document.getElementById('simulator-modal');
  if (simulatorModal) {
    simulatorModal.addEventListener('click', (e) => {
      if (e.target === simulatorModal) {
        closeSimulator();
      }
    });
  }
  
  // Animation control buttons
  const startSimulationBtn = document.getElementById('simulator-start');
  const stopSimulationBtn = document.getElementById('simulator-stop');
  const resetSimulationBtn = document.getElementById('simulator-reset');
  
  if (startSimulationBtn) {
    startSimulationBtn.addEventListener('click', () => {
      isAnimating = true;
      startAnimation();
      startSimulationBtn.disabled = true;
      if (stopSimulationBtn) stopSimulationBtn.disabled = false;
    });
  }
  
  if (stopSimulationBtn) {
    stopSimulationBtn.addEventListener('click', () => {
      isAnimating = false;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      stopSimulationBtn.disabled = true;
      if (startSimulationBtn) startSimulationBtn.disabled = false;
    });
  }
  
  if (resetSimulationBtn) {
    resetSimulationBtn.addEventListener('click', startAnimation);
  }
  
  // Setup parameter controls
  const setpointSlider = document.getElementById('simulator-setpoint');
  const setpointValue = document.getElementById('setpoint-value');
  const disturbanceSlider = document.getElementById('simulator-disturbance');
  const disturbanceValue = document.getElementById('disturbance-value');
  const kpInput = document.getElementById('simulator-kp');
  const kiInput = document.getElementById('simulator-ki');
  const kdInput = document.getElementById('simulator-kd');
  
  // Setup parameter change events
  if (setpointSlider && setpointValue) {
    setpointSlider.addEventListener('input', () => {
      setpointValue.textContent = setpointSlider.value;
    });
  }
  
  if (disturbanceSlider && disturbanceValue) {
    disturbanceSlider.addEventListener('input', () => {
      disturbanceValue.textContent = disturbanceSlider.value;
    });
  }
  
  // Add apply button functionality
  const applyButton = document.getElementById('simulator-apply');
  if (applyButton) {
    applyButton.addEventListener('click', () => {
      const kp = parseFloat(kpInput.value);
      const ki = parseFloat(kiInput.value);
      const kd = parseFloat(kdInput.value);
      
      if (isNaN(kp) || isNaN(ki) || isNaN(kd)) {
        showToast('error', 'Invalid PID parameters');
        return;
      }
      
      // In a real app, this would apply the parameters to the actual controller
      showToast('success', 'Parameters applied to controller');
      closeSimulator();
    });
  }
  
  // Simulator functions
  window.pidSimulator = {
    openSimulator: function(chartData = null) {
      const simulatorModal = document.getElementById('simulator-modal');
      if (!simulatorModal) {
        console.error('Simulator modal not found');
        showToast('error', 'Simulator not available');
        return;
      }
      
      // If chartData is provided, use it directly, otherwise check for global data
      if (chartData) {
        console.log('Using provided chart data for simulation');
        window.currentPIDData = chartData;
      } 
      // Check if we have PID data
      else if (!window.currentPIDData) {
        console.error('No PID data available for simulation');
        
        // Create sample data if no data is available
        window.currentPIDData = generateSamplePIDData();
        console.log('Using sample PID data for simulation', window.currentPIDData);
      }
      
      // Display the modal
      simulatorModal.style.display = 'flex';
      simulatorModal.classList.add('show');
      
      // Initialize the chart
      initSimulatorChart();
      
      // Initialize controller parameters from current PID data
      initializeControllerParameters();
      
      // Start the animation
      startAnimation();
      
      console.log('PID simulator opened');
    },
    
    closeSimulator: function() {
      closeSimulator();
    }
  };
  
  // Close simulator modal
  function closeSimulator() {
    const simulatorModal = document.getElementById('simulator-modal');
    if (simulatorModal) {
      simulatorModal.style.display = 'none';
      simulatorModal.classList.remove('show');
    }
    
    // Cancel any running animation
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    
    isAnimating = false;
    
    // Reset button states
    const startSimulationBtn = document.getElementById('simulator-start');
    const stopSimulationBtn = document.getElementById('simulator-stop');
    
    if (startSimulationBtn) startSimulationBtn.disabled = false;
    if (stopSimulationBtn) stopSimulationBtn.disabled = true;
    
    console.log('PID simulator closed');
  }
  
  // Generate sample PID data for testing
  function generateSamplePIDData() {
    const timestamps = [];
    const setpointValues = [];
    const actualValues = [];
    const finetunedValues = [];
    const upperBoundValues = [];
    const lowerBoundValues = [];
    const issuePointValues = [];
    
    // Generate sample data points
    const numPoints = 100;
    const setpoint = 540;
    
    for (let i = 0; i < numPoints; i++) {
      timestamps.push(i);
      setpointValues.push(setpoint);
      
      // Generate actual values that start low and approach setpoint with some oscillation
      let actualValue = 0;
      if (i < 10) {
        actualValue = i * (setpoint / 20);
      } else if (i < 30) {
        actualValue = setpoint * 0.9 + Math.sin((i - 10) * 0.5) * 50;
      } else if (i < 60) {
        actualValue = setpoint * 0.95 + Math.sin((i - 30) * 0.2) * 30;
      } else {
        actualValue = setpoint + Math.sin(i * 0.1) * 10;
      }
      actualValues.push(actualValue);
      
      // Generate finetuned values (better performance)
      let finetunedValue = 0;
      if (i < 5) {
        finetunedValue = i * (setpoint / 10);
      } else if (i < 15) {
        finetunedValue = setpoint * 0.95 + Math.sin((i - 5) * 0.5) * 30;
      } else {
        finetunedValue = setpoint + Math.sin(i * 0.1) * 5;
      }
      finetunedValues.push(finetunedValue);
      
      // Generate bounds
      upperBoundValues.push(setpoint + 20);
      lowerBoundValues.push(setpoint - 20);
      
      // Generate issue points (only a few points where there are issues)
      issuePointValues.push(i % 20 === 0 && i > 0 ? actualValue + 30 : null);
    }
    
    return {
      name: "Sample PID Controller",
      config: {
        tags: ["Heater", "Temperature", "Zone1"],
        parameters: {
          open_loop: { kp: 1.2, ki: 0.5, kd: 0.1 },
          closed_loop: { kp: 0.5, ki: 0.3, kd: 0.1 }
        }
      },
      status: {
        condition: "Normal",
        class: "normal"
      },
      setpoint: `${setpoint}°C`,
      errorMargin: "±5%",
      tags: ["Heater", "Temperature", "Zone1"],
      parameters: {
        open_loop: { kp: 1.2, ki: 0.5, kd: 0.1 },
        closed_loop: { kp: 0.5, ki: 0.3, kd: 0.1 }
      },
      suggestedParameters: {
        open_loop: { kp: 1.1, ki: 0.6, kd: 0.15 },
        closed_loop: { kp: 0.6, ki: 0.4, kd: 0.15 }
      },
      recommendation: "Consider increasing Ki to improve steady-state response.",
      chartData: {
        timeLabels: timestamps,
        setpoint: setpointValues,
        actual: actualValues,
        upperBound: upperBoundValues,
        lowerBound: lowerBoundValues,
        issuePoints: issuePointValues,
        finetuned: finetunedValues
      }
    };
  }
  
  // Initialize controller parameters from current PID data
  function initializeControllerParameters() {
    if (!window.currentPIDData || !window.currentPIDData.parameters) {
      return;
    }
    
    const closedLoop = window.currentPIDData.parameters.closed_loop;
    if (closedLoop) {
      const kpInput = document.getElementById('simulator-kp');
      const kiInput = document.getElementById('simulator-ki');
      const kdInput = document.getElementById('simulator-kd');
      
      if (kpInput && typeof closedLoop.kp !== 'undefined') {
        kpInput.value = closedLoop.kp;
      }
      
      if (kiInput && typeof closedLoop.ki !== 'undefined') {
        kiInput.value = closedLoop.ki;
      }
      
      if (kdInput && typeof closedLoop.kd !== 'undefined') {
        kdInput.value = closedLoop.kd;
      }
    }
    
    // Set initial setpoint from current PID data
    if (window.currentPIDData.setpoint) {
      const setpointSlider = document.getElementById('simulator-setpoint');
      const setpointValue = document.getElementById('setpoint-value');
      
      // Extract numeric value from setpoint (remove '°C' if present)
      let setpoint = window.currentPIDData.setpoint;
      if (typeof setpoint === 'string') {
        setpoint = parseFloat(setpoint.replace('°C', ''));
      }
      
      if (!isNaN(setpoint) && setpointSlider && setpointValue) {
        // Ensure setpoint is within slider range
        const min = parseInt(setpointSlider.min);
        const max = parseInt(setpointSlider.max);
        setpoint = Math.max(min, Math.min(max, setpoint));
        
        setpointSlider.value = setpoint;
        setpointValue.textContent = setpoint;
      }
    }
  }
  
  // Initialize the simulator chart
  function initSimulatorChart() {
    const chartCanvas = document.getElementById('simulator-chart');
    if (!chartCanvas) {
      console.error('Chart canvas not found');
      return;
    }
    
    // Get chart context
    const ctx = chartCanvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (simulationChart) {
      simulationChart.destroy();
    }
    
    // Prepare data from currentPIDData
    const chartData = prepareSimulationData();
    
    // Create chart configuration
    const chartConfig = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Setpoint',
            data: [],
            borderColor: '#F0B429', // Yellow
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Measured Value',
            data: [],
            borderColor: '#2D7FF9', // Blue
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Finetuned Value',
            data: [],
            borderColor: '#8B5CF6', // Purple
            borderWidth: 2,
            pointRadius: 0,
            borderDash: [5, 5],
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
          x: {
            title: { display: true, text: 'Time' }
          },
          y: {
            title: { display: true, text: 'Value' },
            min: 400,
            max: 600,
            beginAtZero: false, // Make sure it doesn't start at zero
            ticks: {
              // Force minimum and maximum values
              min: 400,
              max: 600,
              stepSize: 50, // Show ticks at 400, 450, 500, 550, 600
              precision: 0   // No decimal places
            }
          }
        },
        //   y: {
        //     title: { display: true, text: 'Temperature (°C)' },
        //     // suggestedMin: 400,
        //     // suggestedMax: 600
            
        //   }
        // },
        plugins: {
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
                  label += context.parsed.y.toFixed(2) + ' °C';
                }
                return label;
              }
            }
          },
          legend: { position: 'top' }
        }
      }
    };
    
    // Create the chart
    simulationChart = new Chart(ctx, chartConfig);
    
    // Update chart with initial data (empty)
    updateSimulatorChart();
  }
  
  // Prepare simulation data from currentPIDData
  function prepareSimulationData() {
    // Check if we have data from the API
    if (!window.currentPIDData || !window.currentPIDData.chartData) {
      console.warn('Missing or incomplete PID data');
      
      // Return empty datasets
      return {
        timeLabels: [],
        setpoint: [],
        actual: [],
        finetuned: []
      };
    }
    
    const { timeLabels, setpoint, actual } = window.currentPIDData.chartData;
    
    // Create finetuned data if not available
    // This simulates what "optimized" parameters would produce
    let finetuned = [];
    if (window.currentPIDData.chartData.finetunedValues) {
      finetuned = window.currentPIDData.chartData.finetunedValues;
    } else {
      // Simulate finetuned values with faster rise time and less overshoot
      finetuned = actual.map((value, index) => {
        const targetValue = setpoint[index] || setpoint[0];
        
        // Improve on actual value - this is a simplistic approach
        if (index < timeLabels.length * 0.1) {
          // Faster rise time in first 10% of time
          return value * 1.2;
        } else if (index < timeLabels.length * 0.2) {
          // Less overshoot near target
          const distance = Math.abs(value - targetValue);
          return targetValue - (distance * 0.5);
        } else {
          // Better steady state
          return targetValue + (Math.random() * 0.2 - 0.1);
        }
      });
    }
    
    return {
      timeLabels,
      setpoint,
      actual,
      finetuned
    };
  }
  
  // Update the simulator chart based on animation progress
  function updateSimulatorChart() {
    if (!simulationChart) return;
    
    const data = prepareSimulationData();
    const dataLength = data.timeLabels.length;
    
    if (dataLength === 0) {
      console.warn('No data available for chart');
      return;
    }
    
    const currentIndex = Math.floor(animationProgress * dataLength);
    
    // Update chart with the data up to the current animation progress
    simulationChart.data.labels = data.timeLabels.slice(0, currentIndex);
    simulationChart.data.datasets[0].data = data.setpoint.slice(0, currentIndex);
    simulationChart.data.datasets[1].data = data.actual.slice(0, currentIndex);
    simulationChart.data.datasets[2].data = data.finetuned.slice(0, currentIndex);
    
    simulationChart.update('none');
  }
  
  // Animation frame function
  function animateSimulator(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const duration = 5000; // 5 seconds for full animation
    
    animationProgress = Math.min(elapsed / duration, 1);
    
    updateSimulatorChart();
    
    if (animationProgress < 1 && isAnimating) {
      animationFrame = requestAnimationFrame(animateSimulator);
    } else {
      isAnimating = false;
      
      // Update button states
      const startSimulationBtn = document.getElementById('simulator-start');
      const stopSimulationBtn = document.getElementById('simulator-stop');
      
      if (startSimulationBtn) startSimulationBtn.disabled = false;
      if (stopSimulationBtn) stopSimulationBtn.disabled = true;
    }
  }
  
  // Start or restart the animation
  function startAnimation() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    
    startTime = null;
    animationProgress = 0;
    isAnimating = true;
    
    // Update button states
    const startSimulationBtn = document.getElementById('simulator-start');
    const stopSimulationBtn = document.getElementById('simulator-stop');
    
    if (startSimulationBtn) startSimulationBtn.disabled = true;
    if (stopSimulationBtn) stopSimulationBtn.disabled = false;
    
    animationFrame = requestAnimationFrame(animateSimulator);
  }
});
