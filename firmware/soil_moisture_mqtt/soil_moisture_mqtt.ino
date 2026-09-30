//ESP32 Soil Moisture Sensor + MQTT Publisher
//This sketch reads soil moisture values, averages them for stability, and publishes the results as JSON to an MQTT broker.

//It uses the following two external libriaries:
//WiFi.h = the WiFi connection (ESP32 core library)
//PubSubClient.h = the MQTT communication

//Include external Libraries
#include <WiFi.h>          //Provides WiFi connectivity functions
#include <PubSubClient.h>  //MQTT client library for Arduino devices


//WiFi Configuration
//The WiFi name and password live in secrets.h, which is not committed to git.
//Copy secrets.example.h to secrets.h and fill in your own network.
#include "secrets.h"
const char* ssid = WIFI_SSID;          //WiFi name (from secrets.h)
const char* password = WIFI_PASSWORD;  //WiFi password (from secrets.h)


//MQTT Broker Configuration
const char* mqtt_server = "public.cloud.shiftr.io";  //Broker adress
const int mqtt_port = 1883;                          //Port number (MQTT over TCP)
const char* mqtt_user = "public";                    //Authentication details (public user)
const char* mqtt_pass = "public";                    //Authentication details (public password)
const char* mqtt_topic = "esp32IDS/Plant1";          //MQTT topic used for publishing


//Soil Moisture Sensor Setup
const int soilPin = 34;  //Analog input pin 34 on ESP32
const int samples = 10;  //Number of readings (readsoilAverage function)

//Calibration values — determined experimentally
const int dryValue = 2507;  //Maximum reading when soil was completely dry
const int wetValue = 850;   //Minimum reading when soil was fully wet


//Globals for WiFi and MQTT (Library Objects)
WiFiClient espClient;                //The WiFiClient establishes a standard TCP connection
PubSubClient mqttClient(espClient);  //Runs the MQTT protocol over that TCP connection


//Timers and Settings
unsigned long lastPublishTime = 0;  //Tracks the time (ms) of the last MQTT publish
const long publishInterval = 2000;  //Interval between publishes in milliseconds (2 sec)


//(Helper) function: Reads the soil sensor multiple times and return the average
int readSoilAverage(int pin, int numSamples) {
  long total = 0;  //Total sum of all readings

  // For-loop that runs numSamples times to read the sensor repeatedly
  for (int i = 0; i < numSamples; i++) {
    total += analogRead(pin);  //Reads analog value from sensor (adds to total)
    delay(10);                 //Pauses program (10 ms) before the next reading
  }

  return total / numSamples;  //Calculate and return the average sensor value
}

// WiFi Setup: Uses WiFi.h
void setupWiFi() {
  delay(100);  //Adds a short delay to ensure the system is ready
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);  //Prints the SSID to the Serial Monitor

  WiFi.begin(ssid, password);              //WiFi library
  while (WiFi.status() != WL_CONNECTED) {  //WiFi.status() returns the current connection state
    delay(500);                            //Waits 500 milliseconds
    Serial.print(".");                     //Prints a dot to the Serial Monitor to show progress
  }

  Serial.println("\nWiFi connected!");
}

// MQTT Reconnection: Uses PubSubClient.h
void ensureMqttConnection() {        // Makes sure the ESP32 is connected to the broker
  while (!mqttClient.connected()) {  // Loop run as long as the client is not connected.
    Serial.print("Connecting to MQTT broker... ");

    //Creates a unique MQTT client ID for the ESP32.
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);  //Random no + hex: combined into one string.


    //PubSubClient.connect()
    //clientId.c_str() converts the Arduino String into a C-style string (PubSubClient requires)
    if (mqttClient.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("connected!");
    } else {
      Serial.print("failed, rc=");                 //Tells  why the connection failed
      Serial.print(mqttClient.state());            //Prints MQTT client’s connection state
      Serial.println(" — retrying in 5 seconds");  //Prints retry message
      delay(5000);                                 //5 seconds before trying again
    }
  }
}


//Arduino Setup Function
void setup() {
  Serial.begin(9600);                            //Start serial monitor (baud rate 9600)
  setupWiFi();                                   //Connect to WiFi using custom setup function
  mqttClient.setServer(mqtt_server, mqtt_port);  //MQTT server config: Broker and port
  pinMode(soilPin, INPUT);                       //Set soil sensor pin as input
}


//Arduino Main Loop
void loop() {
  if (!mqttClient.connected()) {  //Checks if MQTT client is connected to broker
    ensureMqttConnection();       //Reconnect if the connection is lost
  }
  mqttClient.loop();  //Handle MQTT messages and keep connection alive

  unsigned long currentMillis = millis();  //Current time in ms since startup (ESP32)

  if (currentMillis - lastPublishTime > publishInterval) {  //Check if it's time to publish again
    lastPublishTime = currentMillis;

    int soilValue = readSoilAverage(soilPin, samples);                 //Get averaged soil reading
    int moisturePercent = map(soilValue, dryValue, wetValue, 0, 100);  //Convert raw value to moisture %
    moisturePercent = constrain(moisturePercent, 0, 100);              //Keep value within 0–100%

    //Debug output: prints the raw sensor value and the calculated moisture percentage
    Serial.print("Soil raw: ");
    Serial.print(soilValue);
    Serial.print(" | Moisture: ");
    Serial.print(moisturePercent);
    Serial.println("%");

    //Publish to MQTT as a JSON String
    char payload[64];                                                    //C buffer for storing JSON message
    snprintf(payload, sizeof(payload), "{\"soil\":%d,\"moisture\":%d}",  //Formats JSON string
             soilValue, moisturePercent);

    mqttClient.publish(mqtt_topic, payload);  //Sends the JSON payload to MQTT topic
  }
}
