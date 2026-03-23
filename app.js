if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "login.html";
}

const codeReader = new ZXing.BrowserMultiFormatReader();
let scannerControls = null;
let scanning = false;

function setContent(html) {
  document.getElementById("content").innerHTML = html;
}

function searchCustomer(){

let phone = prompt("Enter phone number")

let sales = JSON.parse(localStorage.getItem("sales")) || []

let result = sales.filter(s => s.phone == phone)

console.log(result)
}

function showScannerMessage(message) {
  const content = document.getElementById("content");
  const status = document.getElementById("scannerStatus");

  if (status) {
    status.textContent = message;
    return;
  }

  content.insertAdjacentHTML("beforeend", `<p id="scannerStatus">${message}</p>`);
}

function readMeds() {
  return JSON.parse(localStorage.getItem("meds")) || [];
}

function saveMeds(data) {
  localStorage.setItem("meds", JSON.stringify(data));
}

function addStock() {
  stopScanner();
  setContent(`
    <h2>Add Stock</h2>
    <button onclick="startScan('add')">Scan Barcode</button>
    <input id="manual" placeholder="Enter barcode">
    <button onclick="manualAdd()">Submit</button>
  `);
}

function manualAdd() {
  const code = document.getElementById("manual").value.trim();
  if (!code) {
    alert("Enter a barcode.");
    return;
  }
  processAdd(code);
}

function processAdd(code){

stopScanner()

document.getElementById("content").innerHTML = `
<h3>Barcode: ${code}</h3>

<input id="name" placeholder="Medicine Name">
<input id="qty" placeholder="Quantity">
<input id="price" placeholder="Price">

<button onclick="saveStock('${code}')">Save</button>
`
}

function saveStock(code){

let name = document.getElementById("name").value
let qty = parseInt(document.getElementById("qty").value)
let price = parseInt(document.getElementById("price").value)

if(!name || !qty || !price){
alert("Enter all details ❌")
return
}

let data = JSON.parse(localStorage.getItem("meds")) || []

let existing = data.find(m => m.barcode == code)

if(existing){
existing.qty += qty
existing.price = price
existing.name = name
}else{
data.push({barcode: code, name: name, qty: qty, price: price})
}

localStorage.setItem("meds", JSON.stringify(data))

alert("Stock Updated ✅")
}

function viewStock() {
  stopScanner();

  const data = readMeds();
  let html = "<h2>Stock</h2>";

  if (data.length === 0) {
    html += "<p>No stock available.</p>";
  } else {
    html += data
      .map((med) => `<p>${med.barcode} | Qty: ${med.qty} | Rs. ${med.price}</p>`)
      .join("");
  }

  setContent(html);
}

function scanBill() {
  stopScanner();
  setContent(`
    <h2>Scan Medicine</h2>
    <button onclick="startScan('bill')">Scan</button>
    <input id="manualBill" placeholder="Enter barcode">
    <button onclick="manualBill()">Submit</button>
  `);
}

function manualBill() {
  const code = document.getElementById("manualBill").value.trim();
  if (!code) {
    alert("Enter a barcode.");
    return;
  }
  processBill(code);
}

function processBill(code){

stopScanner()

document.getElementById("content").innerHTML = `
<h3>Barcode: ${code}</h3>

<input id="custName" placeholder="Customer Name">
<input id="custPhone" placeholder="Phone Number">

<input id="qty" placeholder="Quantity">

<button onclick="generateBill('${code}')">Generate Bill</button>
`
}

function generateBill(code){

let qty = parseInt(document.getElementById("qty").value)
let custName = document.getElementById("custName").value
let custPhone = document.getElementById("custPhone").value

if(!qty || !custName){
alert("Enter details ❌")
return
}

let data = JSON.parse(localStorage.getItem("meds")) || []
let med = data.find(m => m.barcode == code)

if(!med){
alert("Medicine not found ❌")
return
}

if(med.qty < qty){
alert("Not enough stock ❌")
return
}

med.qty -= qty
localStorage.setItem("meds", JSON.stringify(data))

let total = qty * med.price

// 📅 DATE
let today = new Date().toLocaleDateString()
let month = new Date().getMonth()

// 💰 DAILY INCOME
let daily = JSON.parse(localStorage.getItem("dailyIncome")) || {}
daily[today] = (daily[today] || 0) + total
localStorage.setItem("dailyIncome", JSON.stringify(daily))

// 💰 MONTHLY INCOME
let monthly = JSON.parse(localStorage.getItem("monthlyIncome")) || {}
monthly[month] = (monthly[month] || 0) + total
localStorage.setItem("monthlyIncome", JSON.stringify(monthly))

// 🧾 SAVE SALES HISTORY
let sales = JSON.parse(localStorage.getItem("sales")) || []

let sale = {
customerName: custName,
phone: custPhone,
medicine: med.name,
barcode: code,
qty: qty,
price: med.price,
total: total,
date: new Date().toLocaleString()
}

sales.push(sale)

localStorage.setItem("sales", JSON.stringify(sales))

// 🧾 INVOICE PAGE
document.getElementById("content").innerHTML = `
<h2>Invoice</h2>

<p><b>Customer:</b> ${custName}</p>
<p><b>Phone:</b> ${custPhone}</p>

<p><b>Medicine:</b> ${med.name}</p>
<p>Qty: ${qty}</p>
<p>Price: ₹${med.price}</p>

<h3>Total: ₹${total}</h3>

<button onclick="window.print()">Print</button>
`
}

function stopScanner() {
  if (scannerControls) {
    if (typeof scannerControls.stop === "function") {
      scannerControls.stop();
    }
    scannerControls = null;
  }

  codeReader.reset();
  scanning = false;

  const video = document.getElementById("video");
  if (video) {
    video.srcObject = null;
  }
}

function startScan(type) {
  if (scanning) {
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("This browser does not support camera scanning.");
    return;
  }

  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    alert("Camera scanning works only on HTTPS or localhost. Open this app through a local server.");
    return;
  }

  setContent("<h2>Scanning...</h2><p>Point the camera at the barcode.</p>");
  scanning = true;

  const videoElement = document.getElementById("video");
  videoElement.setAttribute("data-scan-type", type);

  codeReader
    .decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      videoElement,
      (result, err) => {
        if (result) {
          const code = result.text;
          stopScanner();

          if (type === "add") {
            processAdd(code);
          } else {
            processBill(code);
          }
          return;
        }

        if (err && !(err instanceof ZXing.NotFoundException)) {
          showScannerMessage("Camera opened, but barcode could not be read yet.");
          console.error(err);
        }
      }
    )
    .then((controls) => {
      scannerControls = controls || null;
      showScannerMessage("Camera started. Hold the barcode steady and fill the frame.");
    })
    .catch((err) => {
      stopScanner();
      alert("Unable to access the camera. Please allow camera permission and try again.");
      console.error(err);
    });
}

function viewSales(){

let sales = JSON.parse(localStorage.getItem("sales")) || []

let html = "<h2>Customer Purchase History</h2>"

if(sales.length === 0){
html += "<p>No sales yet</p>"
}else{

sales.reverse().forEach(s => {

html += `
<div style="border:1px solid #ccc; margin:10px; padding:10px;">
<p><b>Name:</b> ${s.customerName}</p>
<p><b>Phone:</b> ${s.phone}</p>
<p><b>Medicine:</b> ${s.medicine}</p>
<p>Qty: ${s.qty}</p>
<p>Total: ₹${s.total}</p>
<p>Date: ${s.date}</p>
</div>
`

})

}

document.getElementById("content").innerHTML = html
}

function viewIncome(){

let today = new Date().toLocaleDateString()
let month = new Date().getMonth()

let daily = JSON.parse(localStorage.getItem("dailyIncome")) || {}
let monthly = JSON.parse(localStorage.getItem("monthlyIncome")) || {}

let todayIncome = daily[today] || 0
let monthIncome = monthly[month] || 0

document.getElementById("content").innerHTML = `
<h2>Income Report</h2>

<p>Today's Income: ₹${todayIncome}</p>
<p>This Month Income: ₹${monthIncome}</p>
`
}

function logout() {
  stopScanner();
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
}

viewStock();
