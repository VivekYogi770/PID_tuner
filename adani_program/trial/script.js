
const formData = new FormData();
formData.append("file", document.querySelector("#fileInput").files[0]);

fetch("/analyze", {
  method: "POST",
  body: formData
})
.then(res => res.json())
.then(data => {
  console.log(data.suggestions);  // Show in UI
  const time = data.plot_data.time;
  const setpoint = data.plot_data.setpoint;
  const measured = data.plot_data.measured;

  // Plot with Chart.js or similar here
});
