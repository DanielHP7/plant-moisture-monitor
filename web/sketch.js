// Plant Moisture Monitor: p5.js visualization
// Subscribes to the ESP32's MQTT topic and shows the plant's condition as an animated flower.
// Original sketch in the p5.js editor: https://editor.p5js.org/julialundager/sketches/25qNyq0OY

// Load the MQTT.js library from a CDN
const mqttUrl = "https://unpkg.com/mqtt/dist/mqtt.min.js";
const script = document.createElement("script");
script.src = mqttUrl;
document.head.appendChild(script);

let mqttClient; // Store the MQTT client connection
let topic = "esp32IDS/Plant1"; // MQTT topic shared with ESP32
let sensorData = { moisture: 0 }; // Object: store incoming sensor values
let flowerState = 1; // Flower state

// When MQTT.js has finished loading, run the MQTT setup function
script.onload = function () {
  setupMQTT();
};

// MQTT setup: create random client ID and define the broker address (WS)
function setupMQTT() {
  const randomId = "p5js_flower_" + Math.random().toString(36).substr(2, 5);
  const broker = "wss://public.cloud.shiftr.io:443";

  // MQTT connection setup
  mqttClient = mqtt.connect(broker, {
    clientId: randomId,
    username: "public",
    password: "public",
  });
  // When connected to the MQTT broker, print a message and subscribe to the topic
  mqttClient.on("connect", () => {
    console.log("Connected to MQTT!");
    mqttClient.subscribe(topic);
  });
  // Handle incoming MQTT messages: convert JSON to JS object and update flower state
  mqttClient.on("message", (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      // Check if the message contains a moisture value
      if (data.moisture !== undefined) {
        sensorData = data; // Store the new sensor data
        updateFlowerState(sensorData.moisture);
        console.log(
          "Moisture:",
          sensorData.moisture,
          "Flower state:",
          flowerState
        );
      }
      // If the message is not valid JSON, print an error
    } catch (e) {
      console.error("Invalid MQTT message:", message.toString());
    }
  });
  // Handle MQTT connection events: closed connection and errors
  mqttClient.on("close", () => console.warn("MQTT connection closed"));
  mqttClient.on("error", (err) => console.error("MQTT error:", err));
}

//Setup function: creating the canvas, and center the text.
function setup() {
  createCanvas(400, 400);
  noStroke();
  textAlign(CENTER);
}

// Draw function: Setting the background to a blue colour.
// Calling the drawFlower and the drawPot functions.

function draw() {
  background(200, 230, 255); // sky blue
  drawFlower(width / 2, height / 2);
  drawPot(1, 190);

  fill(0);
  textSize(16);

  // If statement: Changing the text at the top of the canvas, depending on which flowerState it is.

  if (flowerState == 1) {
    text(
      "I’m blooming with joy! Thanks for keeping me hydrated!",
      width / 2,
      30
    );
  } else if (flowerState == 2) {
    text("Starting to feel a little dry around the roots…", width / 2, 30);
  } else if (flowerState == 3) {
    text("Moisture levels are getting critical, water me ASAP!", width / 2, 30);
  }
}

// Update flower state based on soil moisture
function updateFlowerState(moisturePercent) {
  if (moisturePercent >= 65) flowerState = 1;
  // happy
  else if (moisturePercent >= 35) flowerState = 2;
  // neutral
  else flowerState = 3; // sad
}

// Flower drawing
function drawFlower(x, y) {
  push();
  translate(x, y);

  // Stem
  fill(60, 150, 60);
  rect(-6, 0, 12, 140);

  // Adjust flower visuals depending on state
  let petalColor, faceColor, mouthShape, mouthY;
  if (flowerState === 1) {
    // Happy
    petalColor = color(255, 200, 0);
    faceColor = color(255, 230, 100);
    mouthY = 6;
    mouthShape = "happy";
  } else if (flowerState === 2) {
    // Neutral
    petalColor = color(255, 170, 0);
    faceColor = color(255, 210, 100);
    mouthY = 6;
    mouthShape = "neutral";
  } else {
    // Sad
    petalColor = color(200, 150, 0);
    faceColor = color(230, 190, 90);
    mouthY = 10;
    mouthShape = "sad";
  }

  // Petals
  fill(petalColor);
  for (let i = 0; i < 8; i++) {
    push();
    rotate((TWO_PI / 8) * i);
    ellipse(0, -55, 35, 70);
    pop();
  }

  // Face
  fill(faceColor);
  ellipse(0, 0, 80, 80);

  // Eyes
  fill(0);
  ellipse(-14, -12, 10, 12);
  ellipse(14, -12, 10, 12);

  // Mouth
  stroke(0);
  noFill();
  strokeWeight(3);
  if (mouthShape === "happy") {
    arc(0, mouthY, 30, 18, 0, PI);
  } else if (mouthShape === "neutral") {
    line(-14, mouthY, 14, mouthY);
  } else if (mouthShape === "sad") {
    arc(0, mouthY + 10, 30, 18, PI, 0);
  }
  pop();
}

// Pot drawing
function drawPot(x, y) {
  //Using push to save the current drawing settings.
  push();
  //Using translate to shift origin to the pot position.
  translate(x, y);

  fill(150, 75, 0); // Brown
  //Using beingShape / endShape to make a customized shape
  beginShape();
  vertex(150, 300);
  bezierVertex(130, 200, 130, 150, 200, 150);
  bezierVertex(270, 150, 270, 200, 250, 300);
  endShape(CLOSE);

  fill(120, 60, 0);
  ellipse(200, 150, 100, 20); // Top ellipse
  //Using pop to restore to settings before push is called.
  pop();
}

// Demo mode: press 1, 2 or 3 to preview the flower states without the ESP32 connected.
function keyPressed() {
  if (key === "1") updateFlowerState(80); // happy
  if (key === "2") updateFlowerState(50); // neutral
  if (key === "3") updateFlowerState(20); // sad
}
