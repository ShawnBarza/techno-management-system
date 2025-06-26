#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("PowerMate ESP32 starting...");
}

void loop() {
  Serial.println("Hello from PowerMate!");
  delay(1000);
}