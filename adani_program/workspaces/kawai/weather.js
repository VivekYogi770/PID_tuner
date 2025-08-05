/**
 * Weather API for PID Tuning System
 * Fetches real-time weather data for the Kawai, Rajasthan location
 */

 const weatherAPI = {
    // Coordinates for Kawai, Rajasthan
    kawaiCoordinates: {
      lat: 24.75,
      lon: 76.15
    },
    
    // OpenWeatherMap API key - should be replaced with a real API key
    apiKey: '88ebfa1f53e13b9d922af565b4b65125',
    
    // Initialize weather updates
    init: function() {
      this.updateDateTime();
      setInterval(this.updateDateTime, 30000);
      this.fetchWeather();
    },
    
    // Update date and time in header
    updateDateTime: function() {
      const now = new Date();
      
      // Format date: Mon, Jan 1, 2025
      const dateOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
      const formattedDate = now.toLocaleDateString('en-US', dateOptions);
      
      // Format time: 12:30:45 PM
      const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
      const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
      
      const dateElem = document.getElementById('current-date');
      const timeElem = document.getElementById('current-time');
      
      if (dateElem) dateElem.textContent = formattedDate;
      if (timeElem) timeElem.textContent = formattedTime;
    },
    
    // Fetch weather data from OpenWeatherMap API
    fetchWeather: function() {
      // Coordinates for Kawai, Rajasthan
      const { lat, lon } = this.kawaiCoordinates;
      
      // For demonstration, using sample data since API key isn't real
      // this.useSampleWeatherData();
      
      // In production, uncomment this code and use a real API key
      
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Weather API request failed');
          }
          return response.json();
        })
        .then(data => {
          this.displayWeatherData(data);
        })
        .catch(error => {
          console.error('Error fetching weather:', error);
          this.useSampleWeatherData();
        });
      
    },
    
    // Display weather data in the UI
    displayWeatherData: function(data) {
      const temp = Math.round(data.main.temp);
      const condition = data.weather[0].main;
      const icon = this.getWeatherIcon(data.weather[0].icon);
      
      const weatherElement = document.getElementById('weather-info');
      if (weatherElement) {
        weatherElement.innerHTML = `${temp}°C · ${condition} ${icon}`;
      }
      
      console.log('Weather updated:', { temp, condition, location: 'Kawai, Rajasthan' });
    },
    
    // Use sample weather data when API isn't available
    useSampleWeatherData: function() {
      // Sample weather data for demonstration
      const sampleData = {
        main: { temp: 32 },
        weather: [{ main: 'Sunny', icon: '01d' }]
      };
      
      this.displayWeatherData(sampleData);
    },
    
    // Get appropriate icon for weather condition
    getWeatherIcon: function(iconCode) {
      const iconMap = {
        '01d': '☀️', // Clear sky (day)
        '01n': '🌙', // Clear sky (night)
        '02d': '⛅', // Few clouds (day)
        '02n': '☁️', // Few clouds (night)
        '03d': '☁️', // Scattered clouds
        '03n': '☁️',
        '04d': '☁️', // Broken clouds
        '04n': '☁️',
        '09d': '🌧️', // Shower rain
        '09n': '🌧️',
        '10d': '🌦️', // Rain (day)
        '10n': '🌧️', // Rain (night)
        '11d': '⛈️', // Thunderstorm
        '11n': '⛈️',
        '13d': '❄️', // Snow
        '13n': '❄️',
        '50d': '🌫️', // Mist
        '50n': '🌫️'
      };
      
      return iconMap[iconCode] || '';
    }
  };
  
  // Attach to window object for global access
  window.weatherAPI = weatherAPI;
  
  // Auto-initialize on script load
  document.addEventListener('DOMContentLoaded', () => {
    weatherAPI.init();
  });