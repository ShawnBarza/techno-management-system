# PowerMate - Smart Adapter for Home Appliances

A Wi-Fi controlled smart adapter that allows users to manually control and monitor multiple appliances through a mobile app.

## Features

- ✅ Dual-socket control via mobile app
- ✅ Real-time ON/OFF feedback
- ✅ Compatible with 220V household appliances
- ✅ Current and voltage monitoring (Phase 2)
- ✅ Simple, low-cost setup using ESP32

## Getting Started

### Hardware Requirements
- ESP32 Development Board
- 2-channel Relay Module
- Current Sensors (ACS712)
- Safety components (fuses, optocouplers)

### Development Setup

#### Firmware (ESP32)
```bash
cd firmware
# Install PlatformIO
pip install platformio
# Build and upload
pio run --target upload