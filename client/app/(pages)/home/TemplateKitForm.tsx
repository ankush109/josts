"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useGenerateReportMutation } from "@/app/hooks/mutation/useGenerateReportMutation";
import { useGetReportByIDsQuery } from "@/app/hooks/query/useGetReportByIdQuery";
import Image from "next/image";

/* -------------------- TYPES -------------------- */

type TemplateId = "calibration";

interface CalibrationEquipment {
  deviceName: string;
  manufacturer: string;
  type: string;
  serialNo: string;
  traceability: string;
}

interface CalibrationResult {
  masterReading: string;
  ducReading: string;
  deviation: string;
  acceptableDeviation: string;
  uncertainty: string;
  coverageFactor: string;
}

interface FormData {
  // Page info
  title: string;
  content: string;
  
  // Certificate Details
  certificateNo: string;
  caseNo: string;
  dateOfCalibration: string;
  calibrationValidUpto: string;
  dateOfIssue: string;
  
  // Customer Details
  customerDetails: string;
  
  // Lab Location
  calibrationLabLocation: string;
  
  // Device Under Calibration
  instrumentName: string;
  typeModel: string;
  manufacturer: string;
  slmSerialNo: string;
  micSerialNo: string;
  range: string;
  accuracy: string;
  instrumentCondition: string;
  customerRequirement: string;
  
  // Calibrator Info
  calibratorType: string;
  calibratorSerialNo: string;
  traceabilityReportNo: string;
  calibratorDueDate: string;
  calibrationProcedure: string;
  
  // Environmental Conditions
  airTemperature: string;
  airPressure: string;
  relativeHumidity: string;
  
  // Sensitivity
  sensitivity: string;
  
  // Signatures
  signatory1Name: string;
  signatory2Name: string;
  
  // Optional URLs
  logoUrl: string;
  signature1Url: string;
  signature2Url: string;
  
  // Tables
  calibrationEquipment: CalibrationEquipment[];
  calibrationResults1: CalibrationResult[];
  calibrationResults2: CalibrationResult[];
}

interface Template {
  id: TemplateId;
  name: string;
  preview: string;
}

interface TemplateKitProps {
  reportId?: string;
}

/* -------------------- CONSTANTS -------------------- */

const templates: Template[] = [
  {
    id: "calibration",
    name: "Calibration Certificate",
    preview: "",
  },
];

const defaultFormValues: FormData = {
  title: "",
  content: "",
  certificateNo: "",
  caseNo: "",
  dateOfCalibration: "",
  calibrationValidUpto: "",
  dateOfIssue: "",
  customerDetails: "",
  calibrationLabLocation: "",
  instrumentName: "Sound Level Meter",
  typeModel: "",
  manufacturer: "",
  slmSerialNo: "",
  micSerialNo: "",
  range: "Refer result table",
  accuracy: "",
  instrumentCondition: "Working condition",
  customerRequirement: "",
  calibratorType: "",
  calibratorSerialNo: "",
  traceabilityReportNo: "",
  calibratorDueDate: "",
  calibrationProcedure: "",
  airTemperature: "",
  airPressure: "",
  relativeHumidity: "",
  sensitivity: "",
  signatory1Name: "Mr. S.V. Bhosale, Sr Engineer",
  signatory2Name: "Mr. P. Bhonde, Sr Manager",
  logoUrl: "",
  signature1Url: "",
  signature2Url: "",
  calibrationEquipment: [],
  calibrationResults1: [
    { masterReading: "94 @ 31.5", ducReading: "", deviation: "", acceptableDeviation: "1.5", uncertainty: "± 0.51", coverageFactor: "2.0" },
    { masterReading: "94 @ 63", ducReading: "", deviation: "", acceptableDeviation: "1.0", uncertainty: "±0.50", coverageFactor: "2.0" },
    { masterReading: "94 @ 125", ducReading: "", deviation: "", acceptableDeviation: "1.0", uncertainty: "±0.50", coverageFactor: "2.0" },
    { masterReading: "94 @ 250", ducReading: "", deviation: "", acceptableDeviation: "1.0", uncertainty: "±0.42", coverageFactor: "2.0" },
    { masterReading: "94 @ 500", ducReading: "", deviation: "", acceptableDeviation: "1.0", uncertainty: "±0.37", coverageFactor: "2.0" },
    { masterReading: "94 @ 1000", ducReading: "", deviation: "", acceptableDeviation: "0.7", uncertainty: "±0.42", coverageFactor: "2.0" },
    { masterReading: "94 @ 2000", ducReading: "", deviation: "", acceptableDeviation: "1.0", uncertainty: "±0.58", coverageFactor: "2.0" },
    { masterReading: "94 @ 4000", ducReading: "", deviation: "", acceptableDeviation: "1.0", uncertainty: "±0.63", coverageFactor: "2.0" },
    { masterReading: "94 @ 8000", ducReading: "", deviation: "", acceptableDeviation: "+1.5: -2.5", uncertainty: "±0.78", coverageFactor: "2.0" },
    { masterReading: "94 @ 12500", ducReading: "", deviation: "", acceptableDeviation: "+2.0: -5.0", uncertainty: "±1.31", coverageFactor: "2.0" },
    { masterReading: "94 @ 16000", ducReading: "", deviation: "", acceptableDeviation: "+2.5: -16.0", uncertainty: "±1.84", coverageFactor: "2.0" },
  ],
  calibrationResults2: [
    { masterReading: "94 @ 1000", ducReading: "", deviation: "", acceptableDeviation: "0.7", uncertainty: "±0.42", coverageFactor: "2.0" },
    { masterReading: "104 @ 1000", ducReading: "", deviation: "", acceptableDeviation: "0.7", uncertainty: "±0.42", coverageFactor: "2.0" },
    { masterReading: "114 @ 1000", ducReading: "", deviation: "", acceptableDeviation: "0.7", uncertainty: "±0.42", coverageFactor: "2.0" },
  ],
};

/* -------------------- COMPONENT -------------------- */

export function TemplateKit({ reportId }: TemplateKitProps) {
  const router = useRouter();
  const isEditMode = Boolean(reportId);

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const { mutate: generateReport, isPending } = useGenerateReportMutation();
  const { data: report, isLoading } = useGetReportByIDsQuery(reportId || "");

  const { control, handleSubmit, reset, watch } = useForm<FormData>({
    defaultValues: defaultFormValues,
  });

  const {
    fields: equipmentFields,
    append: appendEquipment,
    remove: removeEquipment,
  } = useFieldArray({
    control,
    name: "calibrationEquipment",
  });

  const {
    fields: results1Fields,
    append: appendResults1,
    remove: removeResults1,
  } = useFieldArray({
    control,
    name: "calibrationResults1",
  });

  const {
    fields: results2Fields,
    append: appendResults2,
    remove: removeResults2,
  } = useFieldArray({
    control,
    name: "calibrationResults2",
  });

  const formValues = watch();
  const [dynamicHtml, setDynamicHtml] = useState("");

  /* -------------------- HTML PREVIEW GENERATION -------------------- */

  const generatePreviewHtml = useCallback((values: FormData) => {
    // Generate calibration equipment rows
    const equipmentRows = values.calibrationEquipment && values.calibrationEquipment.length > 0
      ? values.calibrationEquipment.map(eq => `
          <tr>
            <td>${eq.deviceName || ''}</td>
            <td>${eq.manufacturer || ''}</td>
            <td>${eq.type || ''}</td>
            <td>${eq.serialNo || ''}</td>
            <td>${eq.traceability || ''}</td>
          </tr>
        `).join('')
      : `<tr>
          <td>${values.calibratorType || 'HBK make Type 4226'}</td>
          <td>${values.calibratorSerialNo || '3412415'}</td>
          <td>${values.traceabilityReportNo || 'CDK2506067'}</td>
          <td>${values.calibratorDueDate || '12-09-2026'}</td>
          <td>${values.calibrationProcedure || 'As specified in IEC 60942 Annex B Microphone method'}</td>
        </tr>`;

    // Generate calibration results 1 rows
    const results1Rows = values.calibrationResults1 && values.calibrationResults1.length > 0
      ? values.calibrationResults1.map((result, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${result.masterReading || ''}</td>
            <td>${result.ducReading || ''}</td>
            <td>${result.deviation || ''}</td>
            <td>${result.acceptableDeviation || ''}</td>
            <td>${result.uncertainty || ''}</td>
            <td>${result.coverageFactor || '2.0'}</td>
          </tr>
        `).join('')
      : '';

    // Generate calibration results 2 rows
    const results2Rows = values.calibrationResults2 && values.calibrationResults2.length > 0
      ? values.calibrationResults2.map((result, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${result.masterReading || ''}</td>
            <td>${result.ducReading || ''}</td>
            <td>${result.deviation || ''}</td>
            <td>${result.acceptableDeviation || ''}</td>
            <td>${result.uncertainty || ''}</td>
            <td>${result.coverageFactor || '2.0'}</td>
          </tr>
        `).join('')
      : '';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
          .company-text { font-family: system-ui, -apple-system, sans-serif; font-weight: 300; color:#0891b2; }
          .company-header { width: fit-content; margin: auto; text-align: left; font-size: 13px; line-height: 1.6; color: #374151; }
          .company-details { text-align: center; margin: 0 0 10px 0; font-size: 9pt; line-height: 1.6; }
          .separator-line { border: none; border-top: 2px solid #000; margin: 10px 0 15px 0; }
          .page-number { text-align: right; font-weight: bold; margin-bottom: 10px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 14pt; font-weight: bold; text-decoration: underline; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          table th, table td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
          table th { font-weight: bold; background-color: #f0f0f0; }
          .section-title { font-weight: bold; font-size: 11pt; margin: 15px 0 10px 0; }
          .signature-section { margin-top: 30px; text-align: center; }
          .results-table { font-size: 9pt; }
          .results-table th { background-color: #e0e0e0; font-weight: bold; text-align: center; }
          .results-table td { text-align: center; }
        </style>
      </head>
      <body>
        <div class="company-header">
          <p class="company-details">
            <h1 class="company-text">Jost's Engineering Company Limited</h1>
            Plot No. – 3, S. No. – 126, Paud Road, Pune, Maharashtra – 411038.<br>
            <strong>Contact :</strong> pbhonde@josts.in, sales@josts.in<br>
            <strong>PAN No.</strong> AAACJ1658A | <strong>GST No:</strong> 27AAACJ1658A1ZZ
          </p>
        </div>
        <hr class="separator-line">
        
        <div class="page-number">Page 1 of 2</div>
        
        <div class="header">
          <h1>CERTIFICATE OF CALIBRATION</h1>
        </div>
        
        <table>
          <tr>
            <th>Certificate No:</th>
            <td>${values.certificateNo || ''}</td>
            <th>Case No:</th>
            <td>${values.caseNo || ''}</td>
          </tr>
          <tr>
            <th>Date of Calibration:</th>
            <td>${values.dateOfCalibration || ''}</td>
            <th>Calibration valid Up to:</th>
            <td>${values.calibrationValidUpto || ''}</td>
          </tr>
          <tr>
            <th colspan="2">Date of Issue:</th>
            <td colspan="2">${values.dateOfIssue || ''}</td>
          </tr>
          <tr>
            <th colspan="4">Customer details:</th>
          </tr>
          <tr>
            <td colspan="4">${values.customerDetails || ''}</td>
          </tr>
          <tr>
            <th colspan="4">Calibration lab location:</th>
          </tr>
          <tr>
            <td colspan="4">${values.calibrationLabLocation || ''}</td>
          </tr>
        </table>
        
        <div class="section-title">Identification of Device Under Calibration (DUC)</div>
        
        <table>
          <tr>
            <th>Instrument name:</th>
            <td>${values.instrumentName || 'Sound Level Meter'}</td>
            <th>Type/Model:</th>
            <td>${values.typeModel || ''}</td>
          </tr>
          <tr>
            <th>Manufactured by/Make:</th>
            <td>${values.manufacturer || ''}</td>
            <th>Serial No Part ID Mark:</th>
            <td>SLM: ${values.slmSerialNo || ''}<br>Mic: ${values.micSerialNo || ''}</td>
          </tr>
          <tr>
            <th>Range:</th>
            <td>${values.range || 'Refer result table'}</td>
            <th>Accuracy:</th>
            <td>${values.accuracy || ''}</td>
          </tr>
          <tr>
            <th>Instrument Condition:</th>
            <td colspan="3">${values.instrumentCondition || 'Working condition'}</td>
          </tr>
          <tr>
            <th>Customer requirement:</th>
            <td colspan="3">${values.customerRequirement || ''}</td>
          </tr>
        </table>
        
        <table>
          <tr>
            <th>Multifunctional Acoustic Calibrator</th>
            <th>Calibrator serial no</th>
            <th>Traceability (Report No.)</th>
            <th>Due Date</th>
            <th>Calibration procedure</th>
          </tr>
          ${equipmentRows}
        </table>
        
        <div class="section-title">Environmental test conditions</div>
        
        <table>
          <tr>
            <th>Air temperature (°C)</th>
            <th>Air pressure (kPa)</th>
            <th>Relative humidity (%RH)</th>
          </tr>
          <tr>
            <td>${values.airTemperature || ''}</td>
            <td>${values.airPressure || ''}</td>
            <td>${values.relativeHumidity || ''}</td>
          </tr>
        </table>
        
        <div class="signature-section">
          <div><strong>Authorised Signatory</strong></div>
          <div><strong>[${values.signatory1Name || 'Mr. S.V. Bhosale, Sr Engineer'}] [${values.signatory2Name || 'Mr. P. Bhonde, Sr Manager'}]</strong></div>
        </div>
        
        <hr style="margin: 40px 0;">
        
        <div class="page-number">Page 2 of 2</div>
        
        <div class="section-title">Calibration results</div>
        
        <div class="section-title">@ Sensitivity ${values.sensitivity || '45.6 mV/Pa'}</div>
        
        ${results1Rows ? `
        <table class="results-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Master Reading</th>
              <th>DUC Reading</th>
              <th>Deviation</th>
              <th>± Acceptable Deviation</th>
              <th>Uncertainty at 95.45% C.L.</th>
              <th>Coverage Factor K</th>
            </tr>
            <tr>
              <th></th>
              <th>dB @ Hz</th>
              <th>dB</th>
              <th>dB</th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${results1Rows}
          </tbody>
        </table>
        ` : ''}
        
        ${results2Rows ? `
        <table class="results-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Master Reading</th>
              <th>DUC Reading</th>
              <th>Deviation</th>
              <th>± Acceptable Deviation</th>
              <th>Uncertainty at 95.45% C.L.</th>
              <th>Coverage Factor K</th>
            </tr>
            <tr>
              <th></th>
              <th>dB @ Hz</th>
              <th>dB</th>
              <th>dB</th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${results2Rows}
          </tbody>
        </table>
        ` : ''}
        
        <div class="signature-section">
          <div><strong>Calibrated By Authorised Signatory</strong></div>
          <div><strong>[${values.signatory1Name || 'Mr. S.V. Bhosale, Sr Engineer'}] [${values.signatory2Name || 'Mr. P. Bhonde, Sr Manager'}]</strong></div>
        </div>
      </body>
      </html>
    `;

    setDynamicHtml(html);
  }, []);

  useEffect(() => {
    generatePreviewHtml(formValues);
  }, [formValues, generatePreviewHtml]);

  /* -------------------- EDIT MODE INIT -------------------- */

  useEffect(() => {
    if (!report) return;
    console.log("Loaded report for editing:", report.report);
    
    const tpl = templates[0];
    if (tpl) setSelectedTemplate(tpl);

    const payload = report.report.payload || {};
    reset({
      title: report.report.title || "",
      content: report.report.content || "",
      certificateNo: payload.certificateNo || "",
      caseNo: payload.caseNo || "",
      dateOfCalibration: payload.dateOfCalibration || "",
      calibrationValidUpto: payload.calibrationValidUpto || "",
      dateOfIssue: payload.dateOfIssue || "",
      customerDetails: payload.customerDetails || "",
      calibrationLabLocation: payload.calibrationLabLocation || "",
      instrumentName: payload.instrumentName || "Sound Level Meter",
      typeModel: payload.typeModel || "",
      manufacturer: payload.manufacturer || "",
      slmSerialNo: payload.slmSerialNo || "",
      micSerialNo: payload.micSerialNo || "",
      range: payload.range || "Refer result table",
      accuracy: payload.accuracy || "",
      instrumentCondition: payload.instrumentCondition || "Working condition",
      customerRequirement: payload.customerRequirement || "",
      calibratorType: payload.calibratorType || "",
      calibratorSerialNo: payload.calibratorSerialNo || "",
      traceabilityReportNo: payload.traceabilityReportNo || "",
      calibratorDueDate: payload.calibratorDueDate || "",
      calibrationProcedure: payload.calibrationProcedure || "",
      airTemperature: payload.airTemperature || "",
      airPressure: payload.airPressure || "",
      relativeHumidity: payload.relativeHumidity || "",
      sensitivity: payload.sensitivity || "",
      signatory1Name: payload.signatory1Name || "Mr. S.V. Bhosale, Sr Engineer",
      signatory2Name: payload.signatory2Name || "Mr. P. Bhonde, Sr Manager",
      logoUrl: payload.logoUrl || "",
      signature1Url: payload.signature1Url || "",
      signature2Url: payload.signature2Url || "",
      calibrationEquipment: payload.calibrationEquipment || [],
      calibrationResults1: payload.calibrationResults1 || defaultFormValues.calibrationResults1,
      calibrationResults2: payload.calibrationResults2 || defaultFormValues.calibrationResults2,
    });
  }, [report, reset]);

  /* -------------------- SUBMIT HANDLER -------------------- */

  const submitReport = (status?: "draft") => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    generateReport(
      {
        reportId,
        templateId: selectedTemplate.id,
        title: formValues.title || "Calibration Certificate",
        content: formValues.content || "",
        status,
        payload: formValues,
      },
      {
        onSuccess: () => {
          toast.success(
            status === "draft"
              ? "Draft saved successfully!"
              : "PDF generated successfully!"
          );
          router.push("/home");
        },
        onError: (error) => {
          toast.error(
            `Failed to ${status === "draft" ? "save draft" : "generate PDF"}: ${
              error.message || "Unknown error"
            }`
          );
        },
      }
    );
  };

  /* -------------------- UI -------------------- */

  if (isEditMode && isLoading) {
    return <div className="p-10">Loading draft...</div>;
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {isEditMode ? "Edit Draft" : "Create Calibration Certificate"}
        </h1>

        {selectedTemplate && (
          <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        )}
      </div>

      {!selectedTemplate && !isEditMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className="cursor-pointer hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <Image
                  src="https://4kwallpapers.com/images/walls/thumbs/24356.jpg"
                  alt="Calibration Certificate Template"
                  width={400}
                  height={300}
                  className="mb-4 border"
                />
                <h3 className="font-semibold text-lg">{tpl.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="h-[calc(100vh-200px)] flex flex-col">
            <CardHeader>
              <CardTitle>{selectedTemplate.name} Form</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <form
                onSubmit={handleSubmit(() => submitReport())}
                className="h-full flex flex-col"
              >
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
                    
                    <Controller
                      name="title"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="title">Report Title</Label>
                          <Input {...field} id="title" placeholder="Calibration Certificate" />
                        </div>
                      )}
                    />

                    <Controller
                      name="content"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="content">Description</Label>
                          <Input {...field} id="content" placeholder="Sound level meter calibration" />
                        </div>
                      )}
                    />
                  </div>

                  {/* Certificate Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Certificate Details</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="certificateNo"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="certificateNo">Certificate No</Label>
                            <Input {...field} id="certificateNo" placeholder="JOSTS/CAL/2024/001" />
                          </div>
                        )}
                      />

                      <Controller
                        name="caseNo"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="caseNo">Case No</Label>
                            <Input {...field} id="caseNo" placeholder="CASE-001" />
                          </div>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Controller
                        name="dateOfCalibration"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="dateOfCalibration">Date of Calibration</Label>
                            <Input {...field} id="dateOfCalibration" type="date" />
                          </div>
                        )}
                      />

                      <Controller
                        name="calibrationValidUpto"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="calibrationValidUpto">Valid Up to</Label>
                            <Input {...field} id="calibrationValidUpto" type="date" />
                          </div>
                        )}
                      />

                      <Controller
                        name="dateOfIssue"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="dateOfIssue">Date of Issue</Label>
                            <Input {...field} id="dateOfIssue" type="date" />
                          </div>
                        )}
                      />
                    </div>

                    <Controller
                      name="customerDetails"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="customerDetails">Customer Details</Label>
                          <Textarea {...field} id="customerDetails" placeholder="Customer name, address, etc." rows={3} />
                        </div>
                      )}
                    />

                    <Controller
                      name="calibrationLabLocation"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="calibrationLabLocation">Calibration Lab Location</Label>
                          <Input {...field} id="calibrationLabLocation" placeholder="Pune, Maharashtra" />
                        </div>
                      )}
                    />
                  </div>

                  {/* Device Under Calibration */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Device Under Calibration (DUC)</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="instrumentName"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="instrumentName">Instrument Name</Label>
                            <Input {...field} id="instrumentName" placeholder="Sound Level Meter" />
                          </div>
                        )}
                      />

                      <Controller
                        name="typeModel"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="typeModel">Type/Model</Label>
                            <Input {...field} id="typeModel" placeholder="HBK 2245" />
                          </div>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="manufacturer"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="manufacturer">Manufacturer/Make</Label>
                            <Input {...field} id="manufacturer" placeholder="HBK" />
                          </div>
                        )}
                      />

                      <Controller
                        name="range"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="range">Range</Label>
                            <Input {...field} id="range" placeholder="Refer result table" />
                          </div>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="slmSerialNo"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="slmSerialNo">SLM Serial No</Label>
                            <Input {...field} id="slmSerialNo" placeholder="SLM123456" />
                          </div>
                        )}
                      />

                      <Controller
                        name="micSerialNo"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="micSerialNo">Mic Serial No</Label>
                            <Input {...field} id="micSerialNo" placeholder="MIC789012" />
                          </div>
                        )}
                      />
                    </div>

                    <Controller
                      name="accuracy"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="accuracy">Accuracy</Label>
                          <Input {...field} id="accuracy" placeholder="As Per IS 15575 (Part 1): 2016 Type 1" />
                        </div>
                      )}
                    />

                    <Controller
                      name="instrumentCondition"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="instrumentCondition">Instrument Condition</Label>
                          <Input {...field} id="instrumentCondition" placeholder="Working condition" />
                        </div>
                      )}
                    />

                    <Controller
                      name="customerRequirement"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="customerRequirement">Customer Requirement</Label>
                          <Input {...field} id="customerRequirement" placeholder="1/3rd Octave band calibration" />
                        </div>
                      )}
                    />
                  </div>

                  {/* Calibrator Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Calibrator Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="calibratorType"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="calibratorType">Calibrator Type</Label>
                            <Input {...field} id="calibratorType" placeholder="HBK make Type 4226" />
                          </div>
                        )}
                      />

                      <Controller
                        name="calibratorSerialNo"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="calibratorSerialNo">Calibrator Serial No</Label>
                            <Input {...field} id="calibratorSerialNo" placeholder="3412415" />
                          </div>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="traceabilityReportNo"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="traceabilityReportNo">Traceability Report No</Label>
                            <Input {...field} id="traceabilityReportNo" placeholder="CDK2506067" />
                          </div>
                        )}
                      />

                      <Controller
                        name="calibratorDueDate"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="calibratorDueDate">Due Date</Label>
                            <Input {...field} id="calibratorDueDate" type="date" />
                          </div>
                        )}
                      />
                    </div>

                    <Controller
                      name="calibrationProcedure"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="calibrationProcedure">Calibration Procedure</Label>
                          <Input {...field} id="calibrationProcedure" placeholder="As specified in IEC 60942 Annex B" />
                        </div>
                      )}
                    />
                  </div>

                  {/* Environmental Conditions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Environmental Test Conditions</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <Controller
                        name="airTemperature"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="airTemperature">Air Temperature (°C)</Label>
                            <Input {...field} id="airTemperature" placeholder="25.1 (± 2)" />
                          </div>
                        )}
                      />

                      <Controller
                        name="airPressure"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="airPressure">Air Pressure (kPa)</Label>
                            <Input {...field} id="airPressure" placeholder="102.74" />
                          </div>
                        )}
                      />

                      <Controller
                        name="relativeHumidity"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="relativeHumidity">Humidity (%RH)</Label>
                            <Input {...field} id="relativeHumidity" placeholder="49.0 (±20)" />
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Sensitivity */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Sensitivity</h3>
                    
                    <Controller
                      name="sensitivity"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="sensitivity">Sensitivity</Label>
                          <Input {...field} id="sensitivity" placeholder="45.6 mV/Pa" />
                        </div>
                      )}
                    />
                  </div>

                  {/* Signatures */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Authorized Signatories</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="signatory1Name"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="signatory1Name">Signatory 1 Name</Label>
                            <Input {...field} id="signatory1Name" placeholder="Mr. S.V. Bhosale, Sr Engineer" />
                          </div>
                        )}
                      />

                      <Controller
                        name="signatory2Name"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="signatory2Name">Signatory 2 Name</Label>
                            <Input {...field} id="signatory2Name" placeholder="Mr. P. Bhonde, Sr Manager" />
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Optional URLs */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Optional Media (URLs)</h3>
                    
                    <Controller
                      name="logoUrl"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <Label htmlFor="logoUrl">Logo URL</Label>
                          <Input {...field} id="logoUrl" placeholder="https://example.com/logo.png" />
                        </div>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="signature1Url"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="signature1Url">Signature 1 URL</Label>
                            <Input {...field} id="signature1Url" placeholder="https://example.com/sig1.png" />
                          </div>
                        )}
                      />

                      <Controller
                        name="signature2Url"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <Label htmlFor="signature2Url">Signature 2 URL</Label>
                            <Input {...field} id="signature2Url" placeholder="https://example.com/sig2.png" />
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Calibration Equipment Table (Optional) */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-semibold text-lg">Additional Calibration Equipment (Optional)</h3>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => appendEquipment({
                          deviceName: "",
                          manufacturer: "",
                          type: "",
                          serialNo: "",
                          traceability: "",
                        })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Equipment
                      </Button>
                    </div>

                    {equipmentFields.map((field, index) => (
                      <div key={field.id} className="border p-4 rounded-lg space-y-3 relative">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeEquipment(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                          <Controller
                            name={`calibrationEquipment.${index}.deviceName`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Device Name</Label>
                                <Input {...field} placeholder="Calibration Exciter" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationEquipment.${index}.manufacturer`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Manufacturer</Label>
                                <Input {...field} placeholder="Brüel & Kjær" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationEquipment.${index}.type`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Type</Label>
                                <Input {...field} placeholder="4294" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationEquipment.${index}.serialNo`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Serial No</Label>
                                <Input {...field} placeholder="3309152" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationEquipment.${index}.traceability`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Traceability</Label>
                                <Input {...field} placeholder="OEM" />
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calibration Results Table 1 */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-semibold text-lg">Calibration Results - Table 1</h3>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => appendResults1({
                          masterReading: "",
                          ducReading: "",
                          deviation: "",
                          acceptableDeviation: "",
                          uncertainty: "",
                          coverageFactor: "2.0",
                        })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Row
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600">
                      Master Reading format: "94 @ 1000" (dB @ Hz)
                    </div>

                    {results1Fields.map((field, index) => (
                      <div key={field.id} className="border p-4 rounded-lg space-y-3 relative">
                        {results1Fields.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeResults1(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                          <Controller
                            name={`calibrationResults1.${index}.masterReading`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Master Reading</Label>
                                <Input {...field} placeholder="94 @ 1000" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults1.${index}.ducReading`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>DUC Reading (dB)</Label>
                                <Input {...field} placeholder="93.8" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults1.${index}.deviation`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Deviation (dB)</Label>
                                <Input {...field} placeholder="-0.2" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults1.${index}.acceptableDeviation`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>± Acceptable Deviation</Label>
                                <Input {...field} placeholder="1.0" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults1.${index}.uncertainty`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Uncertainty</Label>
                                <Input {...field} placeholder="±0.42" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults1.${index}.coverageFactor`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Coverage Factor K</Label>
                                <Input {...field} placeholder="2.0" />
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calibration Results Table 2 */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-semibold text-lg">Calibration Results - Table 2</h3>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => appendResults2({
                          masterReading: "",
                          ducReading: "",
                          deviation: "",
                          acceptableDeviation: "",
                          uncertainty: "",
                          coverageFactor: "2.0",
                        })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Row
                      </Button>
                    </div>

                    {results2Fields.map((field, index) => (
                      <div key={field.id} className="border p-4 rounded-lg space-y-3 relative">
                        {results2Fields.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeResults2(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                          <Controller
                            name={`calibrationResults2.${index}.masterReading`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Master Reading</Label>
                                <Input {...field} placeholder="104 @ 1000" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults2.${index}.ducReading`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>DUC Reading (dB)</Label>
                                <Input {...field} placeholder="103.8" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults2.${index}.deviation`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Deviation (dB)</Label>
                                <Input {...field} placeholder="-0.2" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults2.${index}.acceptableDeviation`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>± Acceptable Deviation</Label>
                                <Input {...field} placeholder="0.7" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults2.${index}.uncertainty`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Uncertainty</Label>
                                <Input {...field} placeholder="±0.42" />
                              </div>
                            )}
                          />

                          <Controller
                            name={`calibrationResults2.${index}.coverageFactor`}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <Label>Coverage Factor K</Label>
                                <Input {...field} placeholder="2.0" />
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                <div className="flex gap-4 pt-6 border-t mt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isPending}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isPending ? "Generating..." : isEditMode ? "Update PDF" : "Generate PDF"}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => submitReport("draft")}
                    disabled={isPending}
                  >
                    {isPending ? "Saving..." : "Save Draft"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="h-[calc(100vh-200px)] flex flex-col">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto border rounded p-4 bg-white">
                <div dangerouslySetInnerHTML={{ __html: dynamicHtml }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}