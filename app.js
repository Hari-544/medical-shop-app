if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "login.html";
}

const codeReader = new ZXing.BrowserMultiFormatReader();
let scannerControls = null;
let scanning = false;

function setContent(html) {
  document.getElementById("content").innerHTML = html;
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

function processAdd(code) {
  stopScanner();
  setContent(`
    <h3>Barcode: ${code}</h3>
    <input id="qty" type="number" min="1" placeholder="Quantity">
    <input id="price" type="number" min="1" placeholder="Price">
    <button onclick="saveStock('${code}')">Save</button>
  `);
}

function saveStock(code) {
  const qty = Number(document.getElementById("qty").value);
  const price = Number(document.getElementById("price").value);

  if (!Number.isInteger(qty) || qty <= 0 || !Number.isInteger(price) || price <= 0) {
    alert("Enter a valid quantity and price.");
    return;
  }

  const data = readMeds();
  const existing = data.find((med) => med.barcode === code);

  if (existing) {
    existing.qty = Number(existing.qty) + qty;
    existing.price = price;
  } else {
    data.push({ barcode: code, qty, price });
  }

  saveMeds(data);
  alert("Stock updated successfully.");
  viewStock();
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

function processBill(code) {
  stopScanner();
  setContent(`
    <h3>Barcode: ${code}</h3>
    <input id="qty" type="number" min="1" placeholder="Quantity">
    <button onclick="generateBill('${code}')">Generate Bill</button>
  `);
}

function generateBill(code) {
  const qty = Number(document.getElementById("qty").value);

  if (!Number.isInteger(qty) || qty <= 0) {
    alert("Enter a valid quantity.");
    return;
  }

  const data = readMeds();
  const med = data.find((item) => item.barcode === code);

  if (!med) {
    alert("Medicine not found.");
    return;
  }

  if (Number(med.qty) < qty) {
    alert("Not enough stock.");
    return;
  }

  med.qty = Number(med.qty) - qty;
  saveMeds(data);

  const total = qty * Number(med.price);

  setContent(`
    <h2>Invoice</h2>
    <p>Barcode: ${code}</p>
    <p>Qty: ${qty}</p>
    <p>Price: Rs. ${med.price}</p>
    <h3>Total: Rs. ${total}</h3>
    <button onclick="window.print()">Print</button>
  `);
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

function logout() {
  stopScanner();
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
}

viewStock();
