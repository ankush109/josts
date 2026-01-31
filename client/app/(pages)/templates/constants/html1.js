// templates/certificateTemplate.ts
export const certificateHtmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Calibration</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 20px;
        }

        .company-text {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-weight: 300;
            color:#0891b2;
        }

        .email-link,
        .website-link {
            color: #0891b2;
            text-decoration: none;
            font-weight: 300;
        }

        .email-link:hover,
        .website-link:hover {
            text-decoration: underline;
        }

        .company-header {
            width: fit-content;
            margin: auto;
            text-align: left;
            font-size: 13px;
            line-height: 1.6;
            color: #374151;
        }

        .separator-line {
            border-top: 2px solid #000;
            margin: 10px 0 15px 0;
        }

        .page {
            page-break-after: always;
        }

        .page:last-child {
            page-break-after: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        table th, table td {
            border: 1px solid #000;
            padding: 8px;
        }

        table th {
            background: #f0f0f0;
            font-weight: bold;
        }

        .section-title {
            font-weight: bold;
            margin: 15px 0;
        }

        .signature-images {
            display: flex;
            justify-content: center;
            gap: 20px;
        }
    </style>
</head>

<body>

<div class="page">

    <div class="company-header">
        <h1 class="company-text">Jost's Engineering Company Limited</h1>
        Plot No. – 3, S. No. – 126, Paud Road, Pune, Maharashtra – 411038.<br>
        <strong>Contact:</strong>
        <a href="mailto:pbhonde@josts.in" class="email-link">pbhonde@josts.in</a>,
        <a href="mailto:sales@josts.in" class="email-link">sales@josts.in</a><br>
        <strong>PAN No.</strong> AAACJ1658A | <strong>GST No:</strong> 27AAACJ1658A1ZZ
    </div>

    <hr class="separator-line">

    <h2 style="text-align:center">CERTIFICATE OF CALIBRATION</h2>

    <table>
        <tr>
            <th>Certificate No</th>
            <td><%= certificateNo || '' %></td>
            <th>Case No</th>
            <td><%= caseNo || '' %></td>
        </tr>
        <tr>
            <th>Date of Calibration</th>
            <td><%= dateOfCalibration || '' %></td>
            <th>Valid Up To</th>
            <td><%= calibrationValidUpto || '' %></td>
        </tr>
    </table>

    <% if (logoUrl) { %>
    <div style="text-align:center;margin:20px 0">
        <img src="<%= logoUrl %>" style="max-width:400px" />
    </div>
    <% } %>

    <div class="section-title">Identification of Device Under Calibration</div>

    <table>
        <tr>
            <th>Instrument Name</th>
            <td><%= instrumentName || 'Sound Level Meter' %></td>
            <th>Model</th>
            <td><%= typeModel || 'HBK 2245' %></td>
        </tr>
    </table>

</div>

</body>
</html>
`;
