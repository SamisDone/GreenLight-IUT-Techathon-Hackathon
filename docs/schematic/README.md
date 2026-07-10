# Greenlight — Electrical Schematic

## Pin Mapping

| From | Pin | To | Pin | Purpose |
|---|---|---|---|---|
| ESP32 | GPIO21 (SDA) | PCA9685 | SDA | I2C data |
| ESP32 | GPIO22 (SCL) | PCA9685 | SCL | I2C clock |
| ESP32 | 3V3 | PCA9685 | VCC | logic power |
| ESP32 | GND | PCA9685 | GND | common ground |
| Ext 5-6V PSU | + | PCA9685 | V+ | servo power rail |
| Ext PSU | GND | PCA9685 | GND | shared ground |
| PCA9685 | CH0..CH5 | Servos J1..J6 | signal | one channel per joint |

## Reasoning

<!-- To be filled during Phase 5 -->

## Wokwi Screenshot

<!-- Place screenshot here after building the diagram by hand -->
