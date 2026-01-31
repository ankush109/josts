// Sample data structure for calibration.ejs template
// This is the structure you should pass to renderTemplate() as the data parameter

const sampleData = {
  // Page 1 - Certificate Header
  certificateNo: "CERT-2024-001",
  caseNo: "CASE-2024-001",
  dateOfCalibration: "15-01-2024",
  calibrationValidUpto: "15-01-2025",
  dateOfIssue: "20-01-2024",
  
  // Customer Information
  customerDetails: "ABC Company Ltd.\n123 Business Street\nCity, State - 123456\nContact: +91-1234567890",
  calibrationLabLocation: "Josts Engineering Company Limited\nCalibration Lab, Building A\nIndustrial Area, City - 654321",
  
  // Device Under Calibration (DUC)
  instrumentName: "Sound Level Meter",
  typeModel: "HBK 2245",
  manufacturer: "HBK",
  slmSerialNo: "100449",
  micSerialNo: "234567",
  range: "Refer result table",
  accuracy: "As Per IS 15575 (Part 1): 2016 Type 1",
  instrumentCondition: "Working condition",
  customerRequirement: "1/3rd Octave band calibration as per standard procedure.",
  
  // Calibrator Details
  calibratorType: "HBK make Type 4226",
  calibratorSerialNo: "3412415",
  traceabilityReportNo: "CDK2506067",
  calibratorDueDate: "12-09-2026",
  calibrationProcedure: "As specified in IEC 60942 Annex B Microphone method",
  
  // Environmental Conditions
  airTemperature: "25.1 (± 2)",
  airPressure: "102.74",
  relativeHumidity: "49.0 (±20)",
  
  // Page 2 - Calibration Results
  sensitivity: "45.6 mV/Pa",
  
  // First calibration results table
  calibrationResults1: [
    {
      masterReading: "94 @ 31.5",
      ducReading: "93.8",
      deviation: "-0.2",
      acceptableDeviation: "1.5",
      uncertainty: "± 0.51",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 63",
      ducReading: "93.9",
      deviation: "-0.1",
      acceptableDeviation: "1.0",
      uncertainty: "±0.50",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 125",
      ducReading: "94.0",
      deviation: "0.0",
      acceptableDeviation: "1.0",
      uncertainty: "±0.50",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 250",
      ducReading: "94.1",
      deviation: "0.1",
      acceptableDeviation: "1.0",
      uncertainty: "±0.42",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 500",
      ducReading: "94.0",
      deviation: "0.0",
      acceptableDeviation: "1.0",
      uncertainty: "±0.37",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 1000",
      ducReading: "94.1",
      deviation: "0.1",
      acceptableDeviation: "0.7",
      uncertainty: "±0.42",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 2000",
      ducReading: "93.9",
      deviation: "-0.1",
      acceptableDeviation: "1.0",
      uncertainty: "±0.58",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 4000",
      ducReading: "94.2",
      deviation: "0.2",
      acceptableDeviation: "1.0",
      uncertainty: "±0.63",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 8000",
      ducReading: "94.3",
      deviation: "0.3",
      acceptableDeviation: "+1.5: -2.5",
      uncertainty: "±0.78",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 12500",
      ducReading: "94.5",
      deviation: "0.5",
      acceptableDeviation: "+2.0: -5.0",
      uncertainty: "±1.31",
      coverageFactor: "2.0"
    },
    {
      masterReading: "94 @ 16000",
      ducReading: "94.8",
      deviation: "0.8",
      acceptableDeviation: "+2.5: -16.0",
      uncertainty: "±1.84",
      coverageFactor: "2.0"
    }
  ],
  
  // Second calibration results table
  calibrationResults2: [
    {
      masterReading: "94 @ 1000",
      ducReading: "94.1",
      deviation: "0.1",
      acceptableDeviation: "0.7",
      uncertainty: "±0.42",
      coverageFactor: "2.0"
    },
    {
      masterReading: "104 @ 1000",
      ducReading: "104.2",
      deviation: "0.2",
      acceptableDeviation: "0.7",
      uncertainty: "±0.42",
      coverageFactor: "2.0"
    },
    {
      masterReading: "114 @ 1000",
      ducReading: "114.1",
      deviation: "0.1",
      acceptableDeviation: "0.7",
      uncertainty: "±0.42",
      coverageFactor: "2.0"
    }
  ],
  
  // Signatures and Images (optional)
  logoUrl: "/path/to/company-logo.png", // Optional: URL or base64 data URI
  signature1Url: "/path/to/signature1.png", // Optional: URL or base64 data URI
  signature2Url: "/path/to/signature2.png", // Optional: URL or base64 data URI
  signatory1Name: "Mr. S.V. Bhosale, Sr Engineer",
  signatory2Name: "Mr. P. Bhonde, Sr Manager"
};

// Example of using this with your renderTemplate function:
// const html = await renderTemplate('/path/to/calibration.ejs', sampleData);

// For MongoDB storage, this structure would be stored in the report.payload field:
// report.payload = sampleData;

module.exports = sampleData;