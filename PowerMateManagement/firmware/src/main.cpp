#include <Arduino.h>
#include <WiFi.h>
#include <FirebaseESP32.h>
#include <ArduinoJson.h>

// WiFi credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase credentials - using the same config as the mobile app
#define FIREBASE_API_KEY "AIzaSyBOLz5b02fmsgVga1EqaV-x5UHI2i6N8mA"
#define FIREBASE_PROJECT_ID "powermate-management"

// GPIO Pins for power control
#define POWER_PIN_1 26  // GPIO26 for device 1
#define POWER_PIN_2 27  // GPIO27 for device 2

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setupWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
  Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
}

// ...existing setup and loop functions...
